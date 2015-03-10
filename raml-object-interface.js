var extend = require('extend')
var popsicle = require('popsicle')
var ClientOAuth2 = require('client-oauth2')

/**
 * Export the RamlObject constructor.
 *
 * @type {Function}
 */
module.exports = RamlObject

/**
 * Some default raml object options for functionality.
 *
 * @type {Object}
 */
var DEFAULT_OPTIONS = {
  splitUri: /(?=\/)/
}

/**
 * Map media types to extensions.
 *
 * @type {Object}
 */
var MEDIA_TYPE_TO_EXT = {
  'application/json': 'json',
  'text/xml': 'xml'
}

/**
 * Pull uri parameters out of paths.
 *
 * @type {RegExp}
 */
var TEMPLATE_REGEXP = /\{[^\{\}]+\}/g

/**
 * Initialize a raml object interface.
 *
 * @param {Object} raml
 * @param {Object} options
 */
function RamlObject (raml, options) {
  var opts = extend({}, DEFAULT_OPTIONS, options)

  this._title = raml.title
  this._version = raml.version
  this._baseUri = (raml.baseUri || '').replace(/\/$/, '')
  this._mediaType = raml.mediaType
  this._protocols = raml.protocols
  this._securitySchemes = raml.securitySchemes || {}
  this._securityAuthentication = createSecurityAuthentication(this._securitySchemes)
  this._securedBy = sanitizeSecuredBy(raml.securedBy, raml.securitySchemes)
  this._documentation = array(raml.documentation)
  this._resourceTypes = raml.resourceTypes || {}
  this._traits = raml.traits || {}
  this._resources = createResourceMap(raml, opts)
  this._baseUriParameters = createBaseUriParameters(raml)
}

/**
 * Create getter methods for simple properties.
 */
[
  'title',
  'version',
  'baseUri',
  'mediaType',
  'protocols',
  'securedBy',
  'documentation',
  'baseUriParameters',
  'traits',
  'resourceTypes',
  'securitySchemes'
].forEach(function (prop) {
  var method = 'get' + prop.charAt(0).toUpperCase() + prop.substr(1)

  RamlObject.prototype[method] = function () {
    return this['_' + prop]
  }
})

/**
 * Return an object for supporting a given security scheme name.
 *
 * @param  {String} name
 * @return {Object}
 */
RamlObject.prototype.getSecurityAuthentication = function (name) {
  return this._securityAuthentication[name]
}

/**
 * Get all defined resources as a flat array.
 *
 * @return {Array}
 */
RamlObject.prototype.getResources = function () {
  return Object.keys(this._resources)
}

/**
 * Return a resources child paths.
 *
 * @param  {String} path
 * @return {Array}
 */
RamlObject.prototype.getResourceChildren = function (path) {
  var resource = this._resources[path]

  function getAbsoluteUri (key) {
    return resource.children[key].absoluteUri
  }

  return resource ? Object.keys(resource.children).map(getAbsoluteUri) : []
}

/**
 * Return the resources parent path.
 *
 * @param  {String} path
 * @return {String}
 */
RamlObject.prototype.getResourceParent = function (path) {
  var resource = this._resources[path]

  return resource && resource.parent && resource.parent.absoluteUri
}

/**
 * Return the relative uri of a path.
 *
 * @param  {String} path
 * @return {String}
 */
RamlObject.prototype.getRelativeUri = function (path) {
  var resource = this._resources[path]

  return resource && resource.relativeUri
}

/**
 * Return a resources supported methods.
 *
 * @param  {String} path
 * @return {Array}
 */
RamlObject.prototype.getResourceMethods = function (path) {
  var resource = this._resources[path]

  return resource && Object.keys(resource.methods)
}

/**
 * Extract a resource name from a resource.
 *
 * @param  {String} path
 * @return {String}
 */
RamlObject.prototype.getResourceName = function (path) {
  var resource = this._resources[path]

  return resource && toResourceName(resource.relativeUri)
}

/**
 * Return a resources parameters.
 *
 * @param  {String} path
 * @return {Object}
 */
RamlObject.prototype.getResourceParameters = function (path) {
  var resource = this._resources[path]

  return resource && resource.absoluteUriParameters
}

/**
 * Return the relative parameters.
 *
 * @param  {String} path
 * @return {Object}
 */
RamlObject.prototype.getRelativeParameters = function (path) {
  var resource = this._resources[path]

  return resource && resource.relativeUriParameters
}

/**
 * Return a methods headers.
 *
 * @param  {String} path
 * @param  {String} verb
 * @return {Object}
 */
RamlObject.prototype.getMethodHeaders = function (path, verb) {
  var resource = this._resources[path]
  var method = resource && resource.methods[verb]

  return method && method.headers
}

/**
 * Return a methods query parameters.
 *
 * @param  {String} path
 * @param  {String} verb
 * @return {Object}
 */
RamlObject.prototype.getMethodQueryParameters = function (path, verb) {
  var resource = this._resources[path]
  var method = resource && resource.methods[verb]

  return method && method.queryParameters
}

/**
 * Return a methods supported body.
 *
 * @param  {String} path
 * @param  {String} verb
 * @return {Object}
 */
RamlObject.prototype.getMethodBody = function (path, verb) {
  var resource = this._resources[path]
  var method = resource && resource.methods[verb]

  return method && method.body
}

/**
 * Get a methods response codes.
 *
 * @param  {String} path
 * @param  {String} verb
 * @return {Object}
 */
RamlObject.prototype.getMethodResponses = function (path, verb) {
  var resource = this._resources[path]
  var method = resource && resource.methods[verb]

  return method && method.responses
}

/**
 * Make a request to an endpoint with user-defined options.
 *
 * @param  {String}  path
 * @param  {String}  verb
 * @param  {Object}  opts
 * @return {Promise}
 */
RamlObject.prototype.request = function (path, verb, opts) {
  opts = opts || {}

  var baseUri = this._baseUri
  var baseUriParameters = this._baseUriParameters
  var resourceParameters = this.getResourceParameters(path)

  var url = template(baseUri, opts.baseUriParameters, baseUriParameters) +
    template(path, opts.uriParameters, resourceParameters)

  var reqOpts = {
    url: url,
    method: verb,
    headers: extend({}, opts.headers),
    query: extend({}, opts.queryParameters),
    body: opts.body
  }

  if (opts.user && typeof opts.user.sign === 'function') {
    opts.user.sign(reqOpts)
  }

  return this._request(reqOpts)
}

/**
 * Override the request function.
 *
 * @type {Function}
 */
RamlObject.prototype._request = popsicle

/**
 * Extract all parameters from a url string.
 *
 * @param  {String} path
 * @param  {Object} src
 * @return {Object}
 */
function parameters (path, src) {
  var dest = {}
  var params = array(path.match(TEMPLATE_REGEXP)).map(getParamName)

  src = src || {}

  params.forEach(function (key) {
    if (src[key] != null) {
      dest[key] = src[key]
    } else {
      dest[key] = { type: 'string' }
    }
  })

  return dest
}

/**
 * Fill in a url template using an object and fallback to definition.
 *
 * @param  {String} path
 * @param  {Object} src
 * @param  {Object} def
 * @return {String}
 */
function template (path, src, def) {
  src = src || {}
  def = def || {}

  return path.replace(TEMPLATE_REGEXP, function (match) {
    var name = getParamName(match)

    if (src[name] != null) {
      return src[name]
    }

    if (def[name] && def[name].default != null) {
      return def[name].default
    }

    return ''
  })
}

/**
 * Get the param name from the template regexp.
 *
 * @param  {String} param
 * @return {String}
 */
function getParamName (param) {
  return param.slice(1, -1)
}

/**
 * Transform array-like properties into an array.
 *
 * @param  {Array} value
 * @return {Array}
 */
function array (value) {
  return value == null ? [] : Array.prototype.slice.call(value)
}

/**
 * Returns a structured tree from RAML resources. Adds support for applied
 * resource types, traits and secured by, as well as references between parent
 * and child resources and expanded parameters and path support.
 *
 * @param  {Object} raml
 * @param  {Object} options
 * @return {Object}
 */
function createResourceMap (raml, options) {
  var map = {}

  var root = map['/'] = {
    methods: {},
    children: {},
    relativeUri: '',
    absoluteUri: '',
    relativeUriParameters: {},
    absoluteUriParameters: {}
  }

  function recursiveExtractPaths (obj, parts, resource) {
    var part = parts[0]
    var params = resource && resource.uriParameters || {}

    if (/\{mediaTypeExtension\}$/.test(part)) {
      var extensions = []

      // Support enum media type array, or fall back to "mediaType".
      if (params.mediaTypeExtension && Array.isArray(params.mediaTypeExtension.enum)) {
        params.mediaTypeExtension.enum.forEach(function (mediaTypeExtension) {
          var extension = mediaTypeExtension.replace(/^\./, '')
          var hasExtension = extensions.indexOf(extension) > -1

          if (!hasExtension) {
            extensions.push(extension)
          }
        })
      } else if (raml.mediaType && MEDIA_TYPE_TO_EXT[raml.mediaType]) {
        extensions.push(MEDIA_TYPE_TO_EXT[raml.mediaType])
      }

      // If extensions exist, use those instead over the parameter.
      if (extensions.length) {
        extensions.forEach(function (extension) {
          var pathName = part.replace(/\{mediaTypeExtension\}$/, '.' + extension)
          var pathParts = [pathName].concat(parts.slice(1))

          return recursiveExtractPaths(obj, pathParts, resource)
        })

        return
      }
    }

    if (part !== '/') {
      if (obj.children.hasOwnProperty(part)) {
        obj = obj.children[part]
      } else {
        var uriParams = parameters(part, params)
        var absoluteUri = obj.absoluteUri + part

        obj = obj.children[part] = map[absoluteUri] = {
          parent: obj,
          methods: {},
          children: {},
          relativeUri: part,
          absoluteUri: absoluteUri,
          relativeUriParameters: uriParams,
          absoluteUriParameters: extend({}, obj.absoluteUriParameters, uriParams)
        }
      }
    }

    if (parts.length > 1) {
      recursiveExtractPaths(obj, parts.slice(1), resource)

      return
    }

    compile(obj, resource)
  }

  function attachResource (parent, path, resource) {
    var parts = path.split(options.splitUri)

    recursiveExtractPaths(parent, parts, resource)
  }

  function attachMethod (obj, name, method) {
    var securedBy = (method && method.securedBy) || raml.securedBy

    obj.methods[name] = extend({
      parent: obj
    }, method, {
      securedBy: sanitizeSecuredBy(securedBy, raml.securitySchemes)
    })
  }

  function compile (obj, resources) {
    Object.keys(resources).forEach(function (key) {
      if (/^\//.test(key)) {
        attachResource(obj, key, resources[key])

        return
      }

      if (key === 'type' || key === 'is') {
        return // Apply later.
      }

      attachMethod(obj, key, resources[key])
    })

    // TODO: Apply type and traits.
  }

  if (raml.resources) {
    compile(root, raml.resources)
  }

  return map
}

/**
 * Generating uri parameters are similar to paths, except "version" is injected.
 *
 * @param  {Object} raml
 * @return {Object}
 */
function createBaseUriParameters (raml) {
  var params = parameters(raml.baseUri || '', raml.baseUriParameters)

  // Extend a default value.
  if (params.version) {
    params.version = extend({
      type: 'string',
      default: raml.version
    }, params.version)
  }

  return params
}

/**
 * Sanitize a secured by array according to the security schemes.
 *
 * TODO: Find out if merging settings is useful.
 *
 * @param  {Array}  securedBy
 * @param  {Object} securitySchemes
 * @return {Object}
 */
function sanitizeSecuredBy (securedBy, securitySchemes) {
  var map = {}

  securitySchemes = securitySchemes || {}

  if (!securedBy) {
    return map
  }

  securedBy.forEach(function (name) {
    if (name == null) {
      map['null'] = null

      return
    }

    if (typeof name === 'string') {
      map[name] = securitySchemes[name]

      return
    }

    Object.keys(name).forEach(function (key) {
      var scheme = securitySchemes[key] || {}

      map[key] = extend({}, scheme)
      map[key].settings = extend({}, scheme.settings, name[key])
    })
  })

  return map
}

/**
 * Create security authentication methods from the security schemes.
 *
 * @param  {Object} securitySchemes
 * @return {Object}
 */
function createSecurityAuthentication (securitySchemes) {
  var authentication = {}

  if (!securitySchemes) {
    return authentication
  }

  Object.keys(securitySchemes).forEach(function (key) {
    var scheme = securitySchemes[key] || {}

    if (scheme.type === 'OAuth 2.0') {
      authentication[key] = new ClientOAuth2(scheme.settings)
    }
  })

  return authentication
}

/**
 * Extract the resource name.
 *
 * @param  {String} path
 * @return {String}
 */
function toResourceName (path) {
  var name = path.replace(/^[\.\/]/, '')

  // Handle a single parameter. E.g. "/{param}".
  if (/^\{[^\{\}]+\}$/.test(name)) {
    return name.slice(1, -1)
  }

  // Handle static text with trailing parameters. E.g. "/string{id}".
  return name.replace(/\{.+\}$/, '')
}
