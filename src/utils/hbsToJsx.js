const hbsToJsx = (hbsString, dataKeys = []) => {
  let tempJsxString = hbsString;

  // Handle {{{content}}} for component children
  tempJsxString = tempJsxString.replace(/\{\{\{content\}\}\}/g, '{children}');

  // 1. Handle {{#each array}} ... {{/each}} with support for nested properties
  tempJsxString = tempJsxString.replace(/\{\{\s*#each\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)\s*\{\{\s*\/each\s*\}\}/g, (match, arrayVar, content) => {
    // Process content within each block
    let processedContent = content.trim();
    
    // Handle {{this}} references - replace with current item
    processedContent = processedContent.replace(/\{\{\s*this\s*\}\}/g, '{item}');
    
    // Handle {{this.property}} references
    processedContent = processedContent.replace(/\{\{\s*this\.([a-zA-Z0-9_]+)\s*\}\}/g, '{item.$1}');
    
    // Handle {{@index}} references
    processedContent = processedContent.replace(/\{\{\s*@index\s*\}\}/g, '{index}');
    
    // Handle {{@key}} references  
    processedContent = processedContent.replace(/\{\{\s*@key\s*\}\}/g, '{key}');
    
    // Recursively process the content
    processedContent = hbsToJsx(processedContent, dataKeys);
    
    return `{${arrayVar} && ${arrayVar}.map((item, index) => (<React.Fragment key={index}>${processedContent}</React.Fragment>))}`;
  });

  // 2. Handle {{#with object}} ... {{/with}}
  tempJsxString = tempJsxString.replace(/\{\{\s*#with\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)\s*\{\{\s*\/with\s*\}\}/g, (match, objectVar, content) => {
    let processedContent = content.trim();
    
    // Replace property references within with block
    processedContent = processedContent.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, `{${objectVar}.$1}`);
    
    // Recursively process
    processedContent = hbsToJsx(processedContent, dataKeys);
    
    return `{${objectVar} && (${processedContent})}`;
  });

  // 3. Handle {{#unless condition}} ... {{/unless}}
  tempJsxString = tempJsxString.replace(/\{\{\s*#unless\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)\s*\{\{\s*\/unless\s*\}\}/g, (match, condition, content) => {
    const processedContent = hbsToJsx(content.trim(), dataKeys);
    return `{!${condition} && (${processedContent})}`;
  });

  // 4. Handle {{#unless condition}} ... {{else}} ... {{/unless}}
  tempJsxString = tempJsxString.replace(/\{\{\s*#unless\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)\s*\{\{\s*else\s*\}\}\s*([\s\S]*?)\s*\{\{\s*\/unless\s*\}\}/g, (match, condition, unlessContent, elseContent) => {
    const processedUnlessContent = hbsToJsx(unlessContent.trim(), dataKeys);
    const processedElseContent = hbsToJsx(elseContent.trim(), dataKeys);
    return `{!${condition} ? (${processedUnlessContent}) : (${processedElseContent})}`;
  });

  // 5. Handle {{#repeat variable}} ... {{/repeat}} - Custom helper
  tempJsxString = tempJsxString.replace(/\{\{\s*#repeat\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)\s*\{\{\s*\/repeat\s*\}\}/g, (match, variable, content) => {
    const processedContent = hbsToJsx(content.trim(), dataKeys);
    return `{Array.from({ length: ${variable} || 0 }, (_, i) => (<React.Fragment key={i}>${processedContent}</React.Fragment>))}`;
  });

  // 6. Handle {{#if condition}} ... {{else if condition2}} ... {{else}} ... {{/if}}
  tempJsxString = tempJsxString.replace(/\{\{\s*#if\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)(?:\{\{\s*else\s+if\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?))*\s*(?:\{\{\s*else\s*\}\}\s*([\s\S]*?))?\s*\{\{\s*\/if\s*\}\}/g, (match, condition, ifContent, elseIfCondition, elseIfContent, elseContent) => {
    const processedIfContent = hbsToJsx(ifContent.trim(), dataKeys);
    
    if (elseIfCondition && elseIfContent) {
      const processedElseIfContent = hbsToJsx(elseIfContent.trim(), dataKeys);
      if (elseContent) {
        const processedElseContent = hbsToJsx(elseContent.trim(), dataKeys);
        return `{${condition} ? (${processedIfContent}) : ${elseIfCondition} ? (${processedElseIfContent}) : (${processedElseContent})}`;
      } else {
        return `{${condition} ? (${processedIfContent}) : ${elseIfCondition} ? (${processedElseIfContent}) : null}`;
      }
    } else if (elseContent) {
      const processedElseContent = hbsToJsx(elseContent.trim(), dataKeys);
      return `{${condition} ? (${processedIfContent}) : (${processedElseContent})}`;
    } else {
      return `{${condition} && (${processedIfContent})}`;
    }
  });

  // 7. Handle {{#if condition}} ... {{else}} ... {{/if}} (fallback for simpler cases)
  tempJsxString = tempJsxString.replace(/\{\{\s*#if\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)\s*\{\{\s*else\s*\}\}\s*([\s\S]*?)\s*\{\{\s*\/if\s*\}\}/g, (match, condition, ifContent, elseContent) => {
    const processedIfContent = hbsToJsx(ifContent.trim(), dataKeys);
    const processedElseContent = hbsToJsx(elseContent.trim(), dataKeys);
    return `{${condition} ? (${processedIfContent}) : (${processedElseContent})}`;
  });

  // 8. Handle {{#if condition}} ... {{/if}} (simple if)
  tempJsxString = tempJsxString.replace(/\{\{\s*#if\s+([a-zA-Z0-9_.]+)\s*\}\}\s*([\s\S]*?)\s*\{\{\s*\/if\s*\}\}/g, (match, condition, content) => {
    const processedContent = hbsToJsx(content.trim(), dataKeys);
    return `{${condition} && (${processedContent})}`;
  });

  // 9. Handle Handlebars helpers with parameters
  // {{helper param1 param2}} -> {helper(param1, param2)}
  tempJsxString = tempJsxString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s+([^}]+)\s*\}\}/g, (match, helper, params) => {
    // Split parameters and clean them
    const cleanParams = params.split(/\s+/).map(param => {
      // Handle string literals
      if (param.match(/^["'].*["']$/)) return param;
      // Handle numbers
      if (param.match(/^\d+$/)) return param;
      // Handle variables
      return param;
    }).join(', ');
    
    return `{${helper}(${cleanParams})}`;
  });

  // 10. Handle nested property access {{object.property.subproperty}}
  tempJsxString = tempJsxString.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, variable) => {
    // Skip if already processed or is a JSX expression
    if (variable.includes('{') || variable.includes('}')) return match;
    return `{${variable}}`;
  });

  // 11. Handle Handlebars variables with filters/pipes {{variable | filter}}
  tempJsxString = tempJsxString.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\|\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, variable, filter) => {
    return `{${filter}(${variable})}`;
  });

  // 12. Replace remaining simple variables (fallback)
  if (dataKeys && dataKeys.length > 0) {
    dataKeys.forEach(key => {
      const regex = new RegExp(`\\{\\{\\s*${key.replace('.', '\\.')}\\s*\\}\\}`, 'g');
      tempJsxString = tempJsxString.replace(regex, `{${key}}`);
    });
  }

  // 13. HTML to JSX conversions
  // Replace class with className
  tempJsxString = tempJsxString.replace(/\bclass=/g, 'className=');
  
  // Replace for with htmlFor
  tempJsxString = tempJsxString.replace(/\bfor=/g, 'htmlFor=');
  
  // Handle self-closing tags for void elements
  tempJsxString = tempJsxString.replace(/<(input|img|br|hr|meta|link|area|base|col|embed|source|track|wbr|param)([^>]*?)(?<!\/)\s*>/gi, '<$1$2 />');
  
  // Handle style attribute - convert string to object if needed
  tempJsxString = tempJsxString.replace(/style="([^"]*?)"/g, (match, styles) => {
    if (styles.includes('{')) return match; // Already JSX
    
    // Convert CSS string to object notation
    const styleObj = styles.split(';')
      .filter(style => style.trim())
      .map(style => {
        const [prop, value] = style.split(':').map(s => s.trim());
        if (!prop || !value) return '';
        
        // Convert kebab-case to camelCase
        const camelProp = prop.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        return `${camelProp}: '${value}'`;
      })
      .filter(Boolean)
      .join(', ');
      
    return styleObj ? `style={{${styleObj}}}` : '';
  });

  // 14. Handle HTML comments - convert to JSX comments
  tempJsxString = tempJsxString.replace(/<!--\s*(.*?)\s*-->/gs, '{/* $1 */}');

  // 15. Handle boolean attributes (checked, selected, disabled, etc.)
  tempJsxString = tempJsxString.replace(/\b(checked|selected|disabled|readonly|multiple|autofocus|autoplay|defer|hidden)(?!=)/g, '$1={true}');

  // 16. Clean up extra whitespace and newlines in JSX expressions
  tempJsxString = tempJsxString.replace(/\{\s*([^}]+)\s*\}/g, (match, expr) => {
    return `{${expr.trim()}}`;
  });

  return tempJsxString;
};

// Export for use
export default hbsToJsx;