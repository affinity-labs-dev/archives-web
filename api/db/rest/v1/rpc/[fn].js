import proxy from '../../../[...path].js';
import { stripRouteParam } from '../[table].js';

// The RPC arm of the same split - see the note in ../[table].js for why the
// catch-all could not be relied on, and why the route parameter has to be
// stripped out of the query string.
//
// `rpc/<function>` is two segments after /rest/v1, so it does not match
// [table].js and needs its own route. The handler still decides what is
// allowed: exactly one function, and it discards the caller's argument in
// favour of their own XP, because the RPC answers "what percentile is this
// number" for any number and is an oracle if proxied verbatim.
export default function handler(req, res) {
  req.url = stripRouteParam(req.url, 'fn');
  req.query = { ...req.query, path: ['rest', 'v1', 'rpc', req.query.fn] };
  return proxy(req, res);
}
