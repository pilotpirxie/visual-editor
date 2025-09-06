const hbs = `
<section class="table-dynamic-section {{#if useDarkTheme}}bg-dark text-light{{else}}bg-white{{/if}} py-5">
  <div class="container-fluid">
    {{#each tables}}
    <div class="table-container mb-5">
      <div class="row mb-4">
        <div class="col-12">
          <h3 class="font-weight-bold">{{title}}</h3>
          {{#if subtitle}}
          <p class="text-muted">{{subtitle}}</p>
          {{/if}}
        </div>
      </div>
      <div class="row">
        <div class="col-{{colSize}}">
          <div class="table-wrapper">
            <div class="table-responsive">
              <table class="table {{#if ../useDarkTheme}}table-dark{{/if}} {{#if striped}}table-striped{{/if}} {{#if bordered}}table-bordered{{/if}} {{#if hover}}table-hover{{/if}}">
                {{#if showHeader}}
                <thead class="{{#if ../useDarkTheme}}thead-dark{{else}}thead-light{{/if}}">
                  <tr>
                    {{#each headers}}
                    <th scope="col" class="{{#if sortable}}sortable-header{{/if}}" {{#if sortable}}data-sort="{{field}}"{{/if}}>
                      {{label}}
                      {{#if sortable}}
                      <i class="material-icons sort-icon">unfold_more</i>
                      {{/if}}
                    </th>
                    {{/each}}
                    {{#if ../showActions}}
                    <th scope="col" class="text-center">Actions</th>
                    {{/if}}
                  </tr>
                </thead>
                {{/if}}
                <tbody>
                  {{#each rows}}
                  <tr>
                    {{#each cells}}
                    <td>
                      {{#if isImage}}
                      <img src="{{value}}" alt="{{alt}}" class="img-fluid rounded" style="max-width: 50px; max-height: 50px;">
                      {{else if isBadge}}
                      <span class="badge badge-{{badgeType}}">{{value}}</span>
                      {{else if isButton}}
                      <button class="btn btn-{{buttonType}} btn-sm">{{value}}</button>
                      {{else if isLink}}
                      <a href="{{href}}" class="{{#if ../../../useDarkTheme}}text-light{{else}}text-primary{{/if}}">{{value}}</a>
                      {{else}}
                      {{value}}
                      {{/if}}
                    </td>
                    {{/each}}
                    {{#if ../../showActions}}
                    <td class="text-center">
                      <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-primary" title="Edit">
                          <i class="material-icons">edit</i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-info" title="View">
                          <i class="material-icons">visibility</i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" title="Delete">
                          <i class="material-icons">delete</i>
                        </button>
                      </div>
                    </td>
                    {{/if}}
                  </tr>
                  {{/each}}
                </tbody>
              </table>
            </div>
            {{#if showPagination}}
            <nav aria-label="Table pagination">
              <ul class="pagination justify-content-center">
                <li class="page-item">
                  <a class="page-link" href="#" aria-label="Previous">
                    <i class="material-icons">chevron_left</i>
                  </a>
                </li>
                <li class="page-item active"><a class="page-link" href="#">1</a></li>
                <li class="page-item"><a class="page-link" href="#">2</a></li>
                <li class="page-item"><a class="page-link" href="#">3</a></li>
                <li class="page-item">
                  <a class="page-link" href="#" aria-label="Next">
                    <i class="material-icons">chevron_right</i>
                  </a>
                </li>
              </ul>
            </nav>
            {{/if}}
          </div>
        </div>
      </div>
    </div>
    {{/each}}
  </div>
</section>
`;

const block = {
  hbs,
  name: 'Dynamic Table Section',
  previewImageUrl: 'https://i.imgur.com/table-dynamic.png',
  category: 'table',
  defaultData: {
    showActions: true,
    showPagination: true,
    tables: [
      {
        title: "User Management",
        subtitle: "Manage all registered users in the system",
        colSize: "12",
        striped: true,
        bordered: false,
        hover: true,
        showHeader: true,
        headers: [
          { label: "ID", field: "id", sortable: true },
          { label: "Name", field: "name", sortable: true },
          { label: "Email", field: "email", sortable: true },
          { label: "Status", field: "status", sortable: false },
          { label: "Registration Date", field: "date", sortable: true }
        ],
        rows: [
          {
            cells: [
              { value: "001" },
              { value: "John Doe" },
              { value: "john@example.com", isLink: true, href: "mailto:john@example.com" },
              { value: "Active", isBadge: true, badgeType: "success" },
              { value: "2024-01-15" }
            ]
          },
          {
            cells: [
              { value: "002" },
              { value: "Jane Smith" },
              { value: "jane@example.com", isLink: true, href: "mailto:jane@example.com" },
              { value: "Inactive", isBadge: true, badgeType: "secondary" },
              { value: "2024-01-14" }
            ]
          },
          {
            cells: [
              { value: "003" },
              { value: "Mike Johnson" },
              { value: "mike@example.com", isLink: true, href: "mailto:mike@example.com" },
              { value: "Pending", isBadge: true, badgeType: "warning" },
              { value: "2024-01-13" }
            ]
          }
        ]
      },
      {
        title: "Product Inventory",
        subtitle: "Current stock and product information",
        colSize: "12",
        striped: false,
        bordered: true,
        hover: true,
        showHeader: true,
        headers: [
          { label: "Image", field: "image", sortable: false },
          { label: "Product Name", field: "name", sortable: true },
          { label: "SKU", field: "sku", sortable: true },
          { label: "Price", field: "price", sortable: true },
          { label: "Stock", field: "stock", sortable: true }
        ],
        rows: [
          {
            cells: [
              { value: "https://via.placeholder.com/50x50", isImage: true, alt: "Product 1" },
              { value: "Wireless Headphones" },
              { value: "WH-001" },
              { value: "$99.99" },
              { value: "25", isBadge: true, badgeType: "info" }
            ]
          },
          {
            cells: [
              { value: "https://via.placeholder.com/50x50", isImage: true, alt: "Product 2" },
              { value: "Bluetooth Speaker" },
              { value: "BS-002" },
              { value: "$79.99" },
              { value: "12", isBadge: true, badgeType: "warning" }
            ]
          },
          {
            cells: [
              { value: "https://via.placeholder.com/50x50", isImage: true, alt: "Product 3" },
              { value: "Smart Watch" },
              { value: "SW-003" },
              { value: "$199.99" },
              { value: "0", isBadge: true, badgeType: "danger" }
            ]
          }
        ]
      }
    ],
    useDarkTheme: false,
  },
  config: {
    showActions: {
      type: "boolean",
      name: 'Show Actions Column',
    },
    showPagination: {
      type: "boolean",
      name: 'Show Pagination',
    },
    useDarkTheme: {
      type: "boolean",
      name: 'Use Dark Theme',
    },
  }
};

export default block;