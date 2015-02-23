/* global describe, it */

if (!global.Promise) {
  require('es6-promise').polyfill()
}

var expect = require('chai').expect
var RamlObject = require('./')

describe('raml object interface', function () {
  it('should create a new instance', function () {
    expect(new RamlObject({})).to.be.an.instanceOf(RamlObject)
  })

  describe('basic properties', function () {
    var instance = new RamlObject({
      title: 'Example API',
      version: '1.0',
      baseUri: 'http://{version}.example.com',
      documentation: [{
        title: 'Hello World',
        content: 'This is my API'
      }],
      protocols: ['HTTP'],
      securitySchemes: {
        'oauth_2_0': {
          type: 'OAuth 2.0',
          describedBy: {
            headers: {
              Authorization: null
            }
          }
        }
      },
      securedBy: ['oauth_2_0'],
      resourceTypes: {
        collection: {
          get: {
            is: ['paged']
          }
        }
      },
      traits: {
        paged: {
          queryParameters: {
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 50,
              default: 20
            },
            offset: {
              type: 'number'
            }
          }
        }
      },
      resources: {
        '/users': {
          type: 'collection',
          '/{userId}': {
            get: {
              queryParameters: {
                full: {
                  type: 'boolean',
                  default: false
                }
              }
            }
          },
          post: {
            description: '...',
            body: {
              'application/json': {
                schema: '...',
                example: '...'
              }
            },
            responses: {
              '201': {
                body: {
                  'application/json': {
                    schema: '...',
                    example: '...'
                  }
                }
              }
            }
          }
        }
      }
    })

    it('should get title', function () {
      expect(instance.getTitle()).to.be.a('string')
    })

    it('should get version', function () {
      expect(instance.getVersion()).to.be.a('string')
    })

    it('should get base uri', function () {
      expect(instance.getBaseUri()).to.be.a('string')
    })

    it('should get base uri parameters', function () {
      var params = instance.getBaseUriParameters()

      expect(params).to.be.an('object')
      expect(params.version).to.deep.equal({ type: 'string', default: '1.0' })
    })

    it('should get media type', function () {
      expect(instance.getMediaType()).to.be.undefined
    })

    it('should get secured by', function () {
      expect(instance.getSecuredBy()).to.be.an('object')
    })

    it('should get documentation', function () {
      expect(instance.getDocumentation()).to.be.an('array')
    })

    it('should get resource types', function () {
      expect(instance.getResourceTypes()).to.have.keys(['collection'])
    })

    it('should get traits', function () {
      expect(instance.getTraits()).to.have.keys(['paged'])
    })

    it('should get security schemes', function () {
      expect(instance.getSecuritySchemes()).to.have.keys(['oauth_2_0'])
    })

    it('should get all resource paths', function () {
      expect(instance.getResources()).to.deep.equal([
        '/',
        '/users',
        '/users/{userId}'
      ])
    })

    it.skip('should get a resources methods', function () {
      expect(instance.getResourceMethods('/users')).to.deep.equal(['get'])
    })

    it('should get resource uri parameters', function () {
      expect(instance.getResourceParameters('/users/{userId}')).to.an('object')
    })

    it('should get a resource body', function () {
      expect(instance.getMethodBody('/users', 'post')).to.be.an('object')
    })

    it('should get query parameters', function () {
      var query = instance.getMethodQueryParameters('/users/{userId}', 'get')

      expect(query).to.be.an('object').and.have.keys(['full'])
    })
  })

  describe('media type extension', function () {
    it('should expand media type extension with media type', function () {
      expect(new RamlObject({
        mediaType: 'application/json',
        resources: {
          '/api{mediaTypeExtension}': {
            get: null
          }
        }
      }).getResources()).to.deep.equal([
        '/',
        '/api.json'
      ])
    })

    it('should expand media type extension with enum', function () {
      expect(new RamlObject({
        resources: {
          '/api{mediaTypeExtension}': {
            uriParameters: {
              mediaTypeExtension: {
                enum: ['.json', '.xml']
              }
            },
            get: null
          }
        }
      }).getResources()).to.deep.equal([
        '/',
        '/api.json',
        '/api.xml'
      ])
    })
  })

  describe('authentication', function () {
    describe('oauth2', function () {
      it('should expose oauth2 client', function (done) {
        var instance = new RamlObject({
          securitySchemes: {
            oauth_2_0: {
              type: 'OAuth 2.0'
            }
          }
        })

        var client = instance.getSecurityAuthentication('oauth_2_0')
        var user = client.createToken('abc')

        expect(user.accessToken).to.equal('abc')

        instance._request = function (req) {
          expect(req.headers.Authorization).to.equal('Bearer abc')

          return done()
        }

        instance.request('/test', 'get', { user: user })
      })
    })
  })
})
