# Raml Object Interface

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

An abstract interface to the [standard RAML object](https://github.com/mulesoft-labs/raml-object-standard) representation.

**Please note: This module uses [Popsicle](https://github.com/blakeembrey/popsicle) to make API requests. Promises must be supported or polyfilled on all target environments.**

## Installation

```
npm install raml-object-interface --save
```

## Usage

```js
var gitHub = new RamlObject(gitHubRaml)
```

### getTitle()

Return the API title string or `undefined`.

```js
gitHub.getTitle() //=> "GitHub API v3"
```

### getVersion()

Return the API version string or `undefined`.

```js
gitHub.getVersion() //=> "v3"
```

### getBaseUri()

Return the base uri of the API.

```js
gitHub.getBaseUri() //=> "https://api.gitHub.com"
```

### getMediaType()

Return the global application `mediaType` string.

```js
gitHub.getMediaType() //=> "application/json"
```

### getProtocols()

Return an array of supported API protocols. Only `HTTP` or `HTTPS`.

```js
gitHub.getProtocols() //=> ["HTTPS"]
```

### getSecuredBy()

Return an [object describing](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#declaration-1) the different way to handle authentication.

```js
gitHub.getSecuredBy() //=> { "oauth_2_0": { "type": "OAuth 2.0" }, ... }
```

### getDocumentation()

Return the documentation array.

```js
gitHub.getDocumentation() //=> [{ "title": "Home", "content": "..." }, ...]
```

### getBaseUriParameters()

Return a map of [named parameters](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#named-parameters) used on the base uri.

```js
gitHub.getBaseUriParameters() //=> { "version": { "type": "string", "default": "v3" }, ... }
```

### getResourceTypes()

Return a map of [resource types](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#resource-types-and-traits).

```js
gitHub.getResourceTypes() //=> { "collection": { "get?": null }, ... }
```

### getTraits()

Return a map of [traits](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#resource-types-and-traits).

```js
gitHub.getTraits() //=> { "filterable": { "queryParameters": { filter: { ... } } } }
```

### getSecuritySchemes()

Return a map of [security scheme objects](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#security).

```js
gitHub.getSecuritySchemes() //=> { "oauth_2_0": { "type": "OAuth 2.0", ... } }
```

### getSecurityAuthentication()

Return an authentication instance for a security scheme.

```js
gitHub.getSecurityAuthentication('oauth_2_0') //=> instanceof ClientOAuth2 === true
```

**Supported Authentication Types:**

* [OAuth 2.0](https://github.com/mulesoft/js-client-oauth2)

### getResources()

Return an array of all resource strings.

```js
gitHub.getResources() //=> ["/", "/users", ...]
```

### getResourceChildren(path)

Return an array of valid child resources.

```js
gitHub.getResourceChildren('/') //=> ["/users", ...]
```

### getResourceParent(path)

Return the path of the parent.

```js
gitHub.getResourceParent('/users/{userId}') //=> "/users"
```

### getRelativeUri(path)

Return the relative path to its parent.

```js
gitHub.getRelativeUri('/users/{userId}') //=> "/{userId}"
```

### getRelativeParameters(path)

Return a map of [named parameters](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#named-parameters) used on the relative part of the resource.

```js
gitHub.getRelativeParameters('/users/{userId}') //=> { "userId": { ...} }
```

### getResourceMethods(path)

Return an array of support methods of a resource.

```js
gitHub.getResourceMethods('/users') //=> ["get", "post"]
```

### getResourceParameters(path)

Return a map of [named parameters](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#named-parameters) used on the resource.

```js
gitHub.getResourceParameters('/users') //=> {}
```

### getMethodHeaders(path, method)

Return a map of [named parameters](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#named-parameters) used for the method headers.

```js
gitHub.getMethodHeaders('/users', 'get') //=> { "X-GitHub-Media-Type": { ... }, ... }
```

### getMethodQueryParameters(path, method)

Return a map of [named parameters](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#named-parameters) used for the method query parameters.

```js
gitHub.getMethodHeaders('/users', 'get') //=> { "since": { ... }, ... }
```

### getMethodBody(path, method)

Return a map of [content type bodies](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#body).

```js
gitHub.getMethodBody('/users', 'post') //=> { "application/json": { ... } }
```

### getMethodResponses(path, method)

Return an map of [possible responses](https://github.com/raml-org/raml-spec/blob/master/raml-0.8.md#responses).

```js
gitHub.getMethodResponses('/users', 'get') //=> { "200": { "body": { "application/json": { ... } } } }
```

### request(path, method, options)

Trigger an API request that returns a promise of a [response object](https://github.com/blakeembrey/popsicle#response-objects).

```js
gitHub.request('/users', 'get', {
  body: '...',
  headers: {
    'X-Example': 'ABC'
  },
  queryParameters: {
    since: 123
  }
}) //=> { then: [Function] }
```

**Supported Options:**

* `baseUriParameters` (object) Map of values to use in the base uri string.
* `uriParameters` (object) Map of values to use in the path.
* `headers` (object) Map of values to set as request headers.
* `queryParameters` (object) Map of values to append as the query string.
* `body` (object|string) The body of the request to be sent.
* `user` (object) A user instance provided by an authentication flow (must expose a `sign` method).

## License

Apache License 2.0

[npm-image]: https://img.shields.io/npm/v/raml-object-interface.svg?style=flat
[npm-url]: https://npmjs.org/package/raml-object-interface
[downloads-image]: https://img.shields.io/npm/dm/raml-object-interface.svg?style=flat
[downloads-url]: https://npmjs.org/package/raml-object-interface
[travis-image]: https://img.shields.io/travis/mulesoft-labs/js-raml-object-interface.svg?style=flat
[travis-url]: https://travis-ci.org/mulesoft-labs/js-raml-object-interface
[coveralls-image]: https://img.shields.io/coveralls/mulesoft-labs/js-raml-object-interface.svg?style=flat
[coveralls-url]: https://coveralls.io/r/mulesoft-labs/js-raml-object-interface?branch=master
