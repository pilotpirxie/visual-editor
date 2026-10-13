type AnalyticsScript = { src: string; attributes: Record<string, string> };

function scriptFor(service: string, id: string): AnalyticsScript | null {
  if (service === 'plausible') {
    return { src: 'https://plausible.io/js/script.js', attributes: { 'data-domain': id } };
  } else if (service === 'goatcounter') {
    const endpoint = `https://${encodeURIComponent(id)}.goatcounter.com/count`;
    return { src: 'https://gc.zgo.at/count.js', attributes: { 'data-goatcounter': endpoint } };
  } else if (service === 'cloudflare') {
    return {
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      attributes: { 'data-cf-beacon': JSON.stringify({ token: id }) },
    };
  } else {
    return null;
  }
}

siteRuntime.register({
  name: 'analytics',
  init(root) {
    const doc = root.ownerDocument;
    const id = root.dataset.analyticsId ?? '';
    const script = scriptFor(root.dataset.analyticsService ?? '', id);
    if (script === null || id === '') {
      console.warn('siteRuntime analytics: needs a known service and an id', root);
      return () => {};
    }
    const element = doc.createElement('script');
    element.async = true;
    element.src = script.src;
    for (const [name, value] of Object.entries(script.attributes)) {
      element.setAttribute(name, value);
    }
    doc.head.append(element);
    return () => element.remove();
  },
});
