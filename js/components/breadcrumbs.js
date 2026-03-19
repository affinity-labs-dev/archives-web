// breadcrumbs.js - Navigation breadcrumbs
// crumbs: array of { label, hash } — last item has no hash (current page)

export function renderBreadcrumbs(crumbs) {
  if (!crumbs || crumbs.length === 0) return '';

  var sep = '<svg class="bc__sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>';

  var items = crumbs.map(function(c, i) {
    var isLast = i === crumbs.length - 1;
    if (isLast) {
      return '<span class="bc__current">' + c.label + '</span>';
    }
    return '<a class="bc__link" href="#' + c.hash + '">' + c.label + '</a>' + sep;
  }).join('');

  return '<nav class="bc">' + items + '</nav>';
}
