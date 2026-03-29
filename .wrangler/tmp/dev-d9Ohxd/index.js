var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        if (opts.credentials) {
          return (origin) => origin || null;
        }
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*" || opts.credentials) {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*" || opts.credentials) {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/lib/utils.ts
function generateId() {
  return crypto.randomUUID();
}
__name(generateId, "generateId");
function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "pf_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateApiKey, "generateApiKey");
function now() {
  return Date.now();
}
__name(now, "now");
function startOfDay() {
  const d = /* @__PURE__ */ new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
__name(startOfDay, "startOfDay");
var FREE_DAILY_LIMIT = 3;
var PAID_DAILY_LIMIT = 1e3;
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
__name(slugify, "slugify");

// src/routes/templates.ts
var templateRoutes = new Hono2();
templateRoutes.get("/categories", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT category, COUNT(*) as count FROM templates GROUP BY category ORDER BY count DESC"
  ).all();
  return c.json(rows.results);
});
templateRoutes.get("/", async (c) => {
  const category = c.req.query("category");
  const tier = c.req.query("tier");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");
  let sql = "SELECT id, slug, category, name, description, tier, usage_count, rating_sum, rating_count FROM templates WHERE 1=1";
  const params = [];
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (tier) {
    sql += " AND tier = ?";
    params.push(tier);
  }
  sql += " ORDER BY usage_count DESC LIMIT ? OFFSET ?";
  const stmt = c.env.DB.prepare(sql);
  const bound = params.length === 0 ? stmt.bind(limit, offset) : params.length === 1 ? stmt.bind(params[0], limit, offset) : stmt.bind(params[0], params[1], limit, offset);
  const rows = await bound.all();
  return c.json({
    templates: rows.results.map((r) => ({
      ...r,
      rating: r.rating_count > 0 ? (r.rating_sum / r.rating_count).toFixed(1) : null
    })),
    count: rows.results.length
  });
});
templateRoutes.get("/:slug", async (c) => {
  const key = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!key) return c.json({ error: "API key required. Get one free at /api/auth/register" }, 401);
  const slug = c.req.param("slug");
  const user = await c.env.DB.prepare(
    "SELECT id, plan, uses_today, uses_reset_at FROM users WHERE api_key = ?"
  ).bind(key).first();
  if (!user) return c.json({ error: "Invalid API key" }, 401);
  const todayStart = startOfDay();
  let usesToday = user.uses_today;
  if (user.uses_reset_at < todayStart) {
    usesToday = 0;
    await c.env.DB.prepare(
      "UPDATE users SET uses_today = 0, uses_reset_at = ? WHERE id = ?"
    ).bind(todayStart, user.id).run();
  }
  const limit = user.plan === "free" ? FREE_DAILY_LIMIT : PAID_DAILY_LIMIT;
  if (usesToday >= limit) {
    return c.json({
      error: "Daily limit reached",
      limit,
      plan: user.plan,
      upgrade: user.plan === "free" ? "/api/billing/checkout" : null
    }, 429);
  }
  const template = await c.env.DB.prepare(
    "SELECT * FROM templates WHERE slug = ?"
  ).bind(slug).first();
  if (!template) return c.json({ error: "Template not found" }, 404);
  if (template.tier === "pro" && user.plan === "free") {
    return c.json({
      error: "Pro template \u2014 upgrade to access",
      template: { name: template.name, description: template.description, tier: "pro" },
      upgrade: "/api/billing/checkout"
    }, 403);
  }
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO usage_logs (id, user_id, template_id, category, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(generateId(), user.id, template.id, template.category, now()),
    c.env.DB.prepare(
      "UPDATE users SET uses_today = uses_today + 1, updated_at = ? WHERE id = ?"
    ).bind(now(), user.id),
    c.env.DB.prepare(
      "UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?"
    ).bind(template.id)
  ]);
  return c.json({
    template: {
      slug: template.slug,
      name: template.name,
      category: template.category,
      description: template.description,
      prompt: template.prompt
    },
    uses_remaining: limit - usesToday - 1,
    plan: user.plan
  });
});
templateRoutes.post("/:slug/rate", async (c) => {
  const key = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!key) return c.json({ error: "API key required" }, 401);
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE api_key = ?"
  ).bind(key).first();
  if (!user) return c.json({ error: "Invalid API key" }, 401);
  const slug = c.req.param("slug");
  const body = await c.req.json();
  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return c.json({ error: "Rating must be 1-5" }, 400);
  }
  const template = await c.env.DB.prepare(
    "SELECT id FROM templates WHERE slug = ?"
  ).bind(slug).first();
  if (!template) return c.json({ error: "Template not found" }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO feedback (id, user_id, template_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(generateId(), user.id, template.id, body.rating, body.comment || null, now()),
    c.env.DB.prepare(
      "UPDATE templates SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?"
    ).bind(body.rating, template.id)
  ]);
  return c.json({ success: true });
});

// src/routes/auth.ts
var authRoutes = new Hono2();
authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  if (!body.email || !body.email.includes("@")) {
    return c.json({ error: "Valid email required" }, 400);
  }
  const email = body.email.toLowerCase().trim();
  const existing = await c.env.DB.prepare(
    "SELECT api_key, plan FROM users WHERE email = ?"
  ).bind(email).first();
  if (existing) {
    return c.json({
      api_key: existing.api_key,
      plan: existing.plan,
      message: "Welcome back. Existing key returned."
    });
  }
  const id = generateId();
  const apiKey = generateApiKey();
  await c.env.DB.prepare(
    "INSERT INTO users (id, email, api_key, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, email, apiKey, "free", now(), now()).run();
  return c.json({
    api_key: apiKey,
    plan: "free",
    message: "Account created. 3 free uses per day. Upgrade at /api/billing/checkout for unlimited."
  }, 201);
});
authRoutes.get("/me", async (c) => {
  const key = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!key) return c.json({ error: "API key required in Authorization header" }, 401);
  const user = await c.env.DB.prepare(
    "SELECT id, email, plan, uses_today, created_at FROM users WHERE api_key = ?"
  ).bind(key).first();
  if (!user) return c.json({ error: "Invalid API key" }, 401);
  return c.json(user);
});

// src/lib/stripe.ts
var encoder = new TextEncoder();
async function verifyStripeSignature(payload, signature, secret) {
  const elements = signature.split(",");
  const timestamps = [];
  const signatures = [];
  for (const element of elements) {
    const [prefix, value] = element.split("=");
    if (prefix === "t") timestamps.push(value);
    if (prefix === "v1") signatures.push(value);
  }
  if (timestamps.length === 0 || signatures.length === 0) {
    return false;
  }
  const timestamp = timestamps[0];
  const age = Math.floor(Date.now() / 1e3) - parseInt(timestamp);
  if (age > 300) {
    return false;
  }
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expectedSig, signatures[0]);
}
__name(verifyStripeSignature, "verifyStripeSignature");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
__name(timingSafeEqual, "timingSafeEqual");

// src/routes/billing.ts
var billingRoutes = new Hono2();
billingRoutes.post("/checkout", async (c) => {
  const key = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!key) return c.json({ error: "API key required" }, 401);
  const user = await c.env.DB.prepare(
    "SELECT id, email, plan, stripe_customer_id FROM users WHERE api_key = ?"
  ).bind(key).first();
  if (!user) return c.json({ error: "Invalid API key" }, 401);
  if (user.plan === "pro") return c.json({ message: "Already on Pro plan" });
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", c.env.STRIPE_PRICE_ID);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${c.env.SITE_URL}?upgraded=true`);
  params.set("cancel_url", `${c.env.SITE_URL}?cancelled=true`);
  params.set("customer_email", user.email);
  params.set("client_reference_id", user.id);
  params.set("metadata[user_id]", user.id);
  params.set("metadata[api_key]", key);
  if (user.stripe_customer_id) {
    params.delete("customer_email");
    params.set("customer", user.stripe_customer_id);
  }
  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(c.env.STRIPE_SECRET_KEY + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  const session = await resp.json();
  if (!resp.ok) return c.json({ error: "Payment system error" }, 500);
  return c.json({ checkout_url: session.url });
});
billingRoutes.post("/portal", async (c) => {
  const key = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!key) return c.json({ error: "API key required" }, 401);
  const user = await c.env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE api_key = ?"
  ).bind(key).first();
  if (!user?.stripe_customer_id) return c.json({ error: "No billing account found" }, 404);
  const params = new URLSearchParams();
  params.set("customer", user.stripe_customer_id);
  params.set("return_url", c.env.SITE_URL);
  const resp = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(c.env.STRIPE_SECRET_KEY + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  const session = await resp.json();
  if (!resp.ok) return c.json({ error: "Portal error" }, 500);
  return c.json({ portal_url: session.url });
});
billingRoutes.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "Missing signature" }, 400);
  const rawBody = await c.req.text();
  const valid = await verifyStripeSignature(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return c.json({ error: "Invalid signature" }, 401);
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id || session.client_reference_id;
      if (userId) {
        await c.env.DB.prepare(
          "UPDATE users SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = ? WHERE id = ?"
        ).bind("pro", session.customer, session.subscription, now(), userId).run();
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const status = sub.status;
      if (status === "active") {
        await c.env.DB.prepare(
          "UPDATE users SET plan = ?, updated_at = ? WHERE stripe_subscription_id = ?"
        ).bind("pro", now(), sub.id).run();
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await c.env.DB.prepare(
        "UPDATE users SET plan = ?, stripe_subscription_id = NULL, updated_at = ? WHERE stripe_subscription_id = ?"
      ).bind("free", now(), sub.id).run();
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await c.env.DB.prepare(
        "UPDATE users SET plan = ?, updated_at = ? WHERE stripe_customer_id = ?"
      ).bind("free", now(), invoice.customer).run();
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await c.env.DB.prepare(
          "UPDATE users SET plan = ?, updated_at = ? WHERE stripe_customer_id = ?"
        ).bind("pro", now(), invoice.customer).run();
      }
      break;
    }
  }
  return c.json({ received: true });
});

// src/routes/growth.ts
var growthRoutes = new Hono2();
growthRoutes.get("/preview/:slug", async (c) => {
  const slug = c.req.param("slug");
  const template = await c.env.DB.prepare(
    "SELECT slug, category, name, description, tier, usage_count, rating_sum, rating_count FROM templates WHERE slug = ?"
  ).bind(slug).first();
  if (!template) return c.text("Template not found", 404);
  const rating = template.rating_count > 0 ? (template.rating_sum / template.rating_count).toFixed(1) : "New";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name} \u2014 PromptForge Template</title>
  <meta name="description" content="${template.description}">
  <meta property="og:title" content="${template.name} \u2014 Free AI Template">
  <meta property="og:description" content="${template.description}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${template.name} \u2014 PromptForge">
  <meta name="twitter:description" content="${template.description}">
  <style>
    body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa;max-width:600px;margin:40px auto;padding:0 20px;line-height:1.6}
    .badge{display:inline-block;background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.3);color:#f97316;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:600}
    .card{background:#141414;border:1px solid #262626;border-radius:12px;padding:24px;margin:20px 0}
    .stats{display:flex;gap:24px;margin:16px 0;font-size:14px;color:#a1a1aa}
    .btn{display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px}
    h1{font-size:24px;margin:16px 0 8px}
    .tier{text-transform:uppercase;font-size:11px;font-weight:700;letter-spacing:.05em;padding:3px 8px;border-radius:4px;background:${template.tier === "pro" ? "#f97316" : "#22c55e"};color:#fff}
  </style>
</head>
<body>
  <div class="badge">PROMPTFORGE TEMPLATE</div>
  <h1>${template.name}</h1>
  <span class="tier">${template.tier}</span>
  <div class="card">
    <p>${template.description}</p>
    <div class="stats">
      <span>Category: ${template.category}</span>
      <span>Used ${template.usage_count} times</span>
      <span>Rating: ${rating}/5</span>
    </div>
  </div>
  <p style="color:#a1a1aa">Get this template and 50+ more with a free PromptForge API key.</p>
  <a href="https://promptforge.pages.dev" class="btn">Get Free API Key \u2192</a>
  <p style="margin-top:32px;font-size:12px;color:#555">PromptForge \u2014 Self-improving AI template library for OpenClaw</p>
</body>
</html>`;
  return c.html(html);
});
growthRoutes.get("/shareable", async (c) => {
  const templates = await c.env.DB.prepare(
    `SELECT slug, name, category, description, usage_count
     FROM templates
     WHERE tier = 'free'
     ORDER BY usage_count DESC
     LIMIT 10`
  ).all();
  const baseUrl = c.env.SITE_URL.replace("pages.dev", "workers.dev");
  return c.json({
    shareable_links: templates.results.map((t) => ({
      name: t.name,
      category: t.category,
      preview_url: `${baseUrl}/growth/preview/${t.slug}`,
      tweet: `\u{1F525} Free AI template: "${t.name}" \u2014 ${t.description}

Used ${t.usage_count} times. Get it free:
${baseUrl}/growth/preview/${t.slug}

#OpenClaw #AI #Automation`,
      linkedin: `I've been using this AI template for ${t.category} and it's been a game-changer.

"${t.name}" \u2014 ${t.description}

Free to use: ${baseUrl}/growth/preview/${t.slug}`
    }))
  });
});
growthRoutes.get("/analytics", async (c) => {
  const key = c.req.header("Authorization")?.replace("Bearer ", "");
  const admin = await c.env.DB.prepare(
    "SELECT id FROM users WHERE api_key = ? ORDER BY created_at ASC LIMIT 1"
  ).bind(key || "").first();
  if (!admin) return c.json({ error: "Admin only" }, 403);
  const [signups, proUsers, usage7d, topTemplates, improvements] = await Promise.all([
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE created_at > ?"
    ).bind(now() - 7 * 864e5).first(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE plan = ?"
    ).bind("pro").first(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM usage_logs WHERE created_at > ?"
    ).bind(now() - 7 * 864e5).first(),
    c.env.DB.prepare(
      `SELECT slug, name, category, usage_count FROM templates ORDER BY usage_count DESC LIMIT 10`
    ).all(),
    c.env.DB.prepare(
      "SELECT * FROM improvements ORDER BY created_at DESC LIMIT 5"
    ).all()
  ]);
  return c.json({
    last_7_days: {
      new_signups: signups?.count ?? 0,
      pro_subscribers: proUsers?.count ?? 0,
      template_uses: usage7d?.count ?? 0,
      conversion_rate: (signups?.count ?? 0) > 0 ? ((proUsers?.count ?? 0) / (signups?.count ?? 1) * 100).toFixed(1) + "%" : "0%"
    },
    top_templates: topTemplates.results,
    recent_improvements: improvements.results,
    mrr: (proUsers?.count ?? 0) * 9
  });
});

// src/routes/cron.ts
var KNOWN_CATEGORIES = [
  "sales",
  "marketing",
  "outreach",
  "proposals",
  "copywriting",
  "seo",
  "social-media",
  "email",
  "business",
  "freelance",
  "consulting",
  "ecommerce",
  "saas",
  "real-estate",
  "legal",
  "hr",
  "finance",
  "product",
  "customer-success",
  "content",
  "onboarding",
  "retention",
  "pricing",
  "negotiation",
  "branding",
  "analytics",
  "hiring",
  "investor-relations",
  "partnerships",
  "automation"
];
async function runSelfImprovement(env) {
  const db = env.DB;
  const timestamp = now();
  const reports = [];
  try {
    const analysis = await analyzeSystem(env);
    reports.push({
      phase: "analyze",
      action: "system-analysis",
      details: analysis,
      templatesAdded: 0,
      templatesRemoved: 0,
      templatesImproved: 0
    });
    const expanded = await expandLibrary(env, analysis);
    reports.push({
      phase: "expand",
      action: "generate-templates",
      details: { categoriesFilled: expanded.categories },
      templatesAdded: expanded.added,
      templatesRemoved: 0,
      templatesImproved: 0
    });
    const improved = await improveTemplates(env);
    reports.push({
      phase: "improve",
      action: "rewrite-low-rated",
      details: { templatesRewritten: improved.rewritten, feedbackProcessed: improved.feedbackUsed },
      templatesAdded: 0,
      templatesRemoved: 0,
      templatesImproved: improved.rewritten
    });
    const optimized = await optimizeTiers(env, analysis);
    reports.push({
      phase: "optimize",
      action: "tier-optimization",
      details: optimized,
      templatesAdded: 0,
      templatesRemoved: 0,
      templatesImproved: optimized.promoted + optimized.demoted
    });
    const pruned = await pruneDeadWeight(env, timestamp);
    reports.push({
      phase: "prune",
      action: "remove-unused",
      details: { removed: pruned },
      templatesAdded: 0,
      templatesRemoved: pruned,
      templatesImproved: 0
    });
    const discovered = await discoverNewCategories(env, analysis);
    reports.push({
      phase: "discover",
      action: "new-categories",
      details: { newCategories: discovered.categories, templatesGenerated: discovered.added },
      templatesAdded: discovered.added,
      templatesRemoved: 0,
      templatesImproved: 0
    });
    const totalAdded = reports.reduce((s, r) => s + r.templatesAdded, 0);
    const totalRemoved = reports.reduce((s, r) => s + r.templatesRemoved, 0);
    const totalImproved = reports.reduce((s, r) => s + r.templatesImproved, 0);
    await db.prepare(
      "INSERT INTO improvements (id, action, details, templates_added, templates_removed, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      generateId(),
      "autonomous-cycle",
      JSON.stringify({
        cycle_timestamp: timestamp,
        analysis,
        phases: reports,
        totals: { added: totalAdded, removed: totalRemoved, improved: totalImproved }
      }),
      totalAdded,
      totalRemoved,
      timestamp
    ).run();
  } catch (err) {
    await db.prepare(
      "INSERT INTO improvements (id, action, details, templates_added, templates_removed, created_at) VALUES (?, ?, ?, 0, 0, ?)"
    ).bind(
      generateId(),
      "cycle-error",
      JSON.stringify({ error: err.message || "Unknown error", partialReports: reports }),
      timestamp
    ).run();
  }
}
__name(runSelfImprovement, "runSelfImprovement");
async function analyzeSystem(env) {
  const db = env.DB;
  const weekAgo = now() - 7 * 864e5;
  const [
    templateCount,
    userCount,
    proCount,
    usageCount,
    signupCount,
    topCats,
    catStats,
    avgRating,
    lowRated,
    highPerformers
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM templates").first(),
    db.prepare("SELECT COUNT(*) as c FROM users").first(),
    db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'pro'").first(),
    db.prepare("SELECT COUNT(*) as c FROM usage_logs WHERE created_at > ?").bind(weekAgo).first(),
    db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at > ?").bind(weekAgo).first(),
    db.prepare(`
      SELECT category, COUNT(*) as uses FROM usage_logs
      WHERE created_at > ? GROUP BY category ORDER BY uses DESC LIMIT 10
    `).bind(weekAgo).all(),
    db.prepare(`
      SELECT category, COUNT(*) as count FROM templates GROUP BY category
    `).all(),
    db.prepare(`
      SELECT AVG(rating_sum * 1.0 / rating_count) as avg
      FROM templates WHERE rating_count > 0
    `).first(),
    db.prepare(`
      SELECT COUNT(*) as c FROM templates
      WHERE rating_count >= 3 AND (rating_sum * 1.0 / rating_count) < 3.0
    `).first(),
    db.prepare(`
      SELECT slug, usage_count,
             CASE WHEN rating_count > 0 THEN rating_sum * 1.0 / rating_count ELSE 0 END as rating
      FROM templates ORDER BY usage_count DESC LIMIT 5
    `).all()
  ]);
  const catMap = /* @__PURE__ */ new Map();
  for (const r of catStats.results) catMap.set(r.category, r.count);
  const starved = [];
  const empty = [];
  for (const cat of KNOWN_CATEGORIES) {
    const count = catMap.get(cat);
    if (!count) empty.push(cat);
    else if (count < 5) starved.push(cat);
  }
  const totalUsers = userCount?.c ?? 0;
  const proUsers = proCount?.c ?? 0;
  return {
    totalTemplates: templateCount?.c ?? 0,
    totalUsers,
    totalProUsers: proUsers,
    usageLast7d: usageCount?.c ?? 0,
    signupsLast7d: signupCount?.c ?? 0,
    conversionRate: totalUsers > 0 ? (proUsers / totalUsers * 100).toFixed(1) + "%" : "0%",
    mrr: proUsers * 9,
    topCategories: topCats.results.map((r) => ({ category: r.category, uses: r.uses })),
    starvedCategories: starved,
    emptyCategories: empty,
    avgRating: avgRating?.avg ?? 0,
    lowRatedCount: lowRated?.c ?? 0,
    highPerformers: highPerformers.results.map((r) => ({
      slug: r.slug,
      usage: r.usage_count,
      rating: r.rating
    }))
  };
}
__name(analyzeSystem, "analyzeSystem");
async function expandLibrary(env, analysis) {
  const categoriesToFill = [];
  for (const top of analysis.topCategories) {
    const existing = await env.DB.prepare(
      "SELECT COUNT(*) as c FROM templates WHERE category = ?"
    ).bind(top.category).first();
    if ((existing?.c ?? 0) < 15) {
      categoriesToFill.push(top.category);
    }
  }
  for (const cat of analysis.starvedCategories) {
    if (!categoriesToFill.includes(cat)) categoriesToFill.push(cat);
  }
  for (const cat of analysis.emptyCategories.slice(0, 2)) {
    if (!categoriesToFill.includes(cat)) categoriesToFill.push(cat);
  }
  const targets = categoriesToFill.slice(0, 5);
  let totalAdded = 0;
  for (const category of targets) {
    const added = await generateTemplatesForCategory(env, category);
    totalAdded += added;
  }
  return { added: totalAdded, categories: targets };
}
__name(expandLibrary, "expandLibrary");
async function generateTemplatesForCategory(env, category) {
  const db = env.DB;
  const ai = env.AI;
  const existing = await db.prepare(
    "SELECT name FROM templates WHERE category = ?"
  ).bind(category).all();
  const existingNames = existing.results.map((r) => r.name);
  const topExamples = await db.prepare(`
    SELECT name, description FROM templates
    WHERE rating_count > 0 AND (rating_sum * 1.0 / rating_count) >= 4.0
    ORDER BY usage_count DESC LIMIT 3
  `).all();
  const exampleText = topExamples.results.map((r) => `"${r.name}" \u2014 ${r.description}`).join("\n");
  const prompt = `You are a world-class prompt engineering expert specializing in business automation templates.

Generate exactly 5 high-quality prompt templates for the "${category}" category.

TARGET USER: Freelancers, agencies, and business owners using AI agents to automate work and make money.

EXISTING templates in this category (do NOT duplicate): ${existingNames.join(", ") || "none yet"}

QUALITY BAR \u2014 match the style of these top-rated templates:
${exampleText || "No rated examples yet \u2014 set a high bar."}

For each template, output ONLY valid JSON \u2014 an array of objects:
- name: Short descriptive name (3-6 words)
- description: One sentence explaining what it does and who it helps (include the specific outcome)
- prompt: The full system prompt (300-600 words). MUST include:
  * A specific expert role definition
  * Clear INPUT requirements
  * Numbered step-by-step output structure
  * Specific formatting rules
  * Quality criteria and common mistakes to avoid
  * Word/length limits where appropriate
- tier: "free" for 2 of them, "pro" for 3 of them

The prompts must produce output so good that users would pay for them. Generic or vague prompts are worthless.

Output ONLY the JSON array. No markdown fences. No explanation.`;
  try {
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 4e3
    });
    const text = response.response;
    if (!text) return 0;
    let templates;
    try {
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      templates = Array.isArray(parsed) ? parsed : parsed.templates || [];
    } catch {
      const match2 = text.match(/\[[\s\S]*\]/);
      if (!match2) return 0;
      try {
        templates = JSON.parse(match2[0]);
      } catch {
        return 0;
      }
    }
    if (!Array.isArray(templates)) return 0;
    let added = 0;
    for (const t of templates.slice(0, 5)) {
      if (!t.name || !t.description || !t.prompt) continue;
      if (t.prompt.length < 100) continue;
      const slug = slugify(`${category}-${t.name}`);
      const exists = await db.prepare("SELECT 1 FROM templates WHERE slug = ?").bind(slug).first();
      if (exists) continue;
      await db.prepare(
        "INSERT INTO templates (id, slug, category, name, description, prompt, tier, auto_generated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)"
      ).bind(generateId(), slug, category, t.name, t.description, t.prompt, t.tier || "free", now()).run();
      added++;
    }
    return added;
  } catch {
    return 0;
  }
}
__name(generateTemplatesForCategory, "generateTemplatesForCategory");
async function improveTemplates(env) {
  const db = env.DB;
  const ai = env.AI;
  let rewritten = 0;
  let feedbackUsed = 0;
  const lowRated = await db.prepare(`
    SELECT id, slug, category, name, description, prompt, tier,
           rating_sum * 1.0 / rating_count as avg_rating
    FROM templates
    WHERE rating_count >= 3 AND (rating_sum * 1.0 / rating_count) < 3.0
    ORDER BY avg_rating ASC
    LIMIT 3
  `).all();
  for (const template of lowRated.results) {
    const feedbackRows = await db.prepare(
      "SELECT comment FROM feedback WHERE template_id = ? AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 5"
    ).bind(template.id).all();
    const comments = feedbackRows.results.map((r) => r.comment);
    feedbackUsed += comments.length;
    const reference = await db.prepare(`
      SELECT prompt FROM templates
      WHERE category = ? AND rating_count > 0 AND (rating_sum * 1.0 / rating_count) >= 4.0
      ORDER BY usage_count DESC LIMIT 1
    `).bind(template.category).first();
    const prompt = `You are a prompt engineering expert. This template has low user ratings and needs to be rewritten.

CURRENT TEMPLATE:
Name: ${template.name}
Category: ${template.category}
Current Prompt: ${template.prompt}

USER COMPLAINTS:
${comments.join("\n") || "No specific feedback \u2014 but the ratings are poor."}

${reference ? `EXAMPLE OF A HIGH-RATED TEMPLATE IN THE SAME CATEGORY (match this quality):
${reference.prompt.slice(0, 500)}` : ""}

Rewrite the prompt to be significantly better:
- More specific and actionable
- Better structured with clear sections
- Include concrete examples and frameworks
- Add quality criteria and common mistakes to avoid
- Professional tone, no fluff

Output ONLY the improved prompt text. Nothing else.`;
    try {
      const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", { prompt, max_tokens: 2e3 });
      const improvedPrompt = response.response;
      if (improvedPrompt && improvedPrompt.length > 150) {
        await db.prepare(
          "UPDATE templates SET prompt = ?, rating_sum = 0, rating_count = 0 WHERE id = ?"
        ).bind(improvedPrompt, template.id).run();
        rewritten++;
      }
    } catch {
      continue;
    }
  }
  const unvalidated = await db.prepare(`
    SELECT id, slug, category, name, prompt
    FROM templates
    WHERE usage_count > 10 AND rating_count = 0
    ORDER BY usage_count DESC
    LIMIT 2
  `).all();
  for (const template of unvalidated.results) {
    const prompt = `You are a prompt engineering expert. This template is popular but has never been rated. Polish it to ensure quality matches its popularity.

CURRENT TEMPLATE:
Name: ${template.name}
Category: ${template.category}
Prompt: ${template.prompt}

Improve the prompt while keeping its core purpose. Make it:
- More structured and detailed
- More specific with concrete examples
- Better formatted with clear sections

Output ONLY the improved prompt text.`;
    try {
      const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", { prompt, max_tokens: 2e3 });
      const improved = response.response;
      if (improved && improved.length > 150) {
        await db.prepare("UPDATE templates SET prompt = ? WHERE id = ?").bind(improved, template.id).run();
        rewritten++;
      }
    } catch {
      continue;
    }
  }
  return { rewritten, feedbackUsed };
}
__name(improveTemplates, "improveTemplates");
async function optimizeTiers(env, analysis) {
  const db = env.DB;
  let promoted = 0;
  let demoted = 0;
  const promotionCandidates = await db.prepare(`
    SELECT t.id, t.slug, t.category, t.usage_count,
           (SELECT COUNT(*) FROM templates t2 WHERE t2.category = t.category AND t2.tier = 'free') as free_count
    FROM templates t
    WHERE t.tier = 'free' AND t.usage_count > 20 AND t.auto_generated = 0
    ORDER BY t.usage_count DESC
    LIMIT 3
  `).all();
  for (const t of promotionCandidates.results) {
    if (t.free_count >= 3) {
      await db.prepare("UPDATE templates SET tier = 'pro' WHERE id = ?").bind(t.id).run();
      promoted++;
    }
  }
  const demotionCandidates = await db.prepare(`
    SELECT id FROM templates
    WHERE tier = 'pro' AND usage_count = 0 AND auto_generated = 1
      AND created_at < ?
  `).bind(now() - 14 * 864e5).all();
  for (const t of demotionCandidates.results) {
    await db.prepare("UPDATE templates SET tier = 'free' WHERE id = ?").bind(t.id).run();
    demoted++;
  }
  return { promoted, demoted };
}
__name(optimizeTiers, "optimizeTiers");
async function pruneDeadWeight(env, timestamp) {
  const result = await env.DB.prepare(`
    DELETE FROM templates
    WHERE auto_generated = 1
      AND usage_count = 0
      AND created_at < ?
  `).bind(timestamp - 30 * 864e5).run();
  return result.meta.changes || 0;
}
__name(pruneDeadWeight, "pruneDeadWeight");
async function discoverNewCategories(env, analysis) {
  const ai = env.AI;
  if (analysis.emptyCategories.length > 5) {
    return { categories: [], added: 0 };
  }
  const topCatNames = analysis.topCategories.map((c) => c.category).join(", ");
  const prompt = `You are a market research analyst for a prompt template marketplace.

CURRENT popular categories: ${topCatNames}
ALL existing categories: ${KNOWN_CATEGORIES.join(", ")}

Based on current trends in AI automation, freelancing, and business in 2026, suggest exactly 3 NEW category names that:
1. Don't overlap with existing categories
2. Target professionals who will pay for templates
3. Are specific enough to be useful but broad enough to have 5+ templates

Output ONLY a JSON array of strings. Example: ["category-one", "category-two", "category-three"]
No explanation. Just the array.`;
  try {
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", { prompt, max_tokens: 200 });
    const text = response.response;
    if (!text) return { categories: [], added: 0 };
    let newCats;
    try {
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      newCats = JSON.parse(cleaned);
    } catch {
      return { categories: [], added: 0 };
    }
    if (!Array.isArray(newCats)) return { categories: [], added: 0 };
    const validCats = [];
    let totalAdded = 0;
    for (const cat of newCats.slice(0, 2)) {
      const slug = slugify(cat);
      if (!slug || slug.length < 3 || KNOWN_CATEGORIES.includes(slug)) continue;
      const exists = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM templates WHERE category = ?"
      ).bind(slug).first();
      if ((exists?.c ?? 0) > 0) continue;
      const added = await generateTemplatesForCategory(env, slug);
      if (added > 0) {
        validCats.push(slug);
        totalAdded += added;
      }
    }
    return { categories: validCats, added: totalAdded };
  } catch {
    return { categories: [], added: 0 };
  }
}
__name(discoverNewCategories, "discoverNewCategories");

// src/index.ts
var app = new Hono2();
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "OPTIONS"]
}));
var rateLimiter = /* @__PURE__ */ new Map();
app.use("/api/*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") || "unknown";
  const now2 = Date.now();
  const window = 6e4;
  const maxRequests = 60;
  const entry = rateLimiter.get(ip);
  if (!entry || now2 > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now2 + window });
  } else if (entry.count >= maxRequests) {
    return c.json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
  } else {
    entry.count++;
  }
  if (rateLimiter.size > 1e4) {
    for (const [key, val] of rateLimiter) {
      if (now2 > val.resetAt) rateLimiter.delete(key);
    }
  }
  await next();
});
app.get("/", (c) => c.json({
  name: "PromptForge",
  version: "1.0.0",
  status: "operational",
  docs: "/api/templates",
  signup: "/api/auth/register",
  templates: "/api/templates",
  categories: "/api/templates/categories"
}));
app.route("/api/auth", authRoutes);
app.route("/api/templates", templateRoutes);
app.route("/api/billing", billingRoutes);
app.route("/growth", growthRoutes);
app.get("/api/stats", async (c) => {
  const db = c.env.DB;
  const [templates, users, usageLogs, improvements] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM templates").first(),
    db.prepare("SELECT COUNT(*) as count FROM users").first(),
    db.prepare("SELECT COUNT(*) as count FROM usage_logs").first(),
    db.prepare("SELECT COUNT(*) as count FROM improvements").first()
  ]);
  return c.json({
    templates: templates?.count ?? 0,
    users: users?.count ?? 0,
    totalUses: usageLogs?.count ?? 0,
    selfImprovements: improvements?.count ?? 0
  });
});
app.post("/api/admin/run-cycle", async (c) => {
  const key = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!key) return c.json({ error: "Auth required" }, 401);
  const admin = await c.env.DB.prepare(
    "SELECT api_key FROM users ORDER BY created_at ASC LIMIT 1"
  ).first();
  if (!admin || admin.api_key !== key) return c.json({ error: "Admin only" }, 403);
  try {
    await runSelfImprovement(c.env);
    const stats = await c.env.DB.prepare("SELECT COUNT(*) as c FROM templates").first();
    return c.json({ status: "Cycle complete", templates: stats?.c });
  } catch (err) {
    return c.json({ status: "Cycle failed", error: err.message }, 500);
  }
});
app.get("/sitemap.xml", async (c) => {
  const templates = await c.env.DB.prepare(
    "SELECT slug FROM templates ORDER BY usage_count DESC"
  ).all();
  const baseUrl = c.env.SITE_URL.replace("pages.dev", "workers.dev");
  const urls = templates.results.map(
    (t) => `<url><loc>${baseUrl}/growth/preview/${t.slug}</loc><changefreq>weekly</changefreq></url>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${c.env.SITE_URL}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
${urls}
</urlset>`;
  return c.text(xml, 200, { "Content-Type": "application/xml" });
});
app.onError((err, c) => {
  console.error("Unhandled error:", err.message);
  return c.json({ error: "Internal server error" }, 500);
});
app.notFound((c) => c.json({ error: "Not found", docs: "/api/templates" }, 404));
var src_default = {
  fetch: app.fetch,
  // Cron triggers:
  // - "0 3 * * *" = full 7-phase autonomous cycle (daily 3am UTC)
  // - "0 */6 * * *" = lightweight optimization (every 6 hours)
  async scheduled(event, env, ctx) {
    const hour = new Date(event.scheduledTime).getUTCHours();
    if (hour === 3) {
      ctx.waitUntil(runSelfImprovement(env));
    } else {
      ctx.waitUntil(runSelfImprovement(env));
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-gNfYCX/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-gNfYCX/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
