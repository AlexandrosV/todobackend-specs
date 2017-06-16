var chai = require('chai'),
    should = chai.should,
    expect = chai.expect,
    Promise = require('bluebird'),
    request = require('superagent-promise')(require('superagent'),Promise),
    chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var url = process.env.URL || 'http://localhost:8000/todos';

// Testing cross-origin headers
describe('Cross Origin Request', function() {
  var result;
  // Creates an OPTIONS request and captures the promise into 'result'
  before(function(){
      result = request('OPTIONS', url)
        .set('Origin', 'http://test.com')
        .end();
  });

  // Test case 1
  it('should return the correct CORS headers', function() {
    return assert(result, "header").to.contain.all.keys([
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ]);
  });

  // Test case 2
  it('should allow all origins', function() {
    return expect(result).to.eventually.have.property('header').that.has.property('access-control-allow-origin','*');
  });
}); 

// Testing HTTP verbs
describe('Create Todo item', function() {
  var result;

  before(function() {
    result = post(url, { title: 'Test the API using nodejs' });
  });

  it('should return 201 CREATED response', function() {
    return assert(result, "status").to.equal(201);
  }); 

  it('should receive location hyperlink', function() {
    return expect(result).to.eventually.have.property('header').that.has.property('location').to.match(/^https?:\/\/.+\/todos\/[\d]+$/);
  });

  it('should create item', function() {
    var item = result.then(function(res) {
      return get(res.header['location']); 
    });

    return expect(item).to.eventually.have.property('body').that.has.property('title', 'Test the API using nodejs');
  }); 

  after(function() {
    return del(url);
  });
});

describe('Update Todo item', function() {
  var location;

  beforeEach(function(done) {
    post(url, {title: 'Test the API using nodejs'}).then(function(res) {
      location = res.header['location'];
      done();
    });
  });

  it('should have set completed as true - PUT request', function() {
    var result = update(location, 'PUT', {'completed': true});
    return expect(result).to.eventually.have.property('body').that.has.property('completed').to.be.true;
  });

  it('should have set completed as true - PATCH request', function() {
    var result = update(location, 'PATCH', {'completed': true});
    return expect(result).to.eventually.have.property('body').that.has.property('completed').to.be.true;
  });

  after(function () {
    return del(url);
  });
});

describe('Delete Todo item', function() {
  var location;

  beforeEach(function(done) {
    post(url, {title: 'Test the API using nodejs'}).then(function(res) {
      location = res.header['location'];
      done();
    });
  });

  it('should return 204 NO CONTENT response', function() {
    var result = del(location);
    return assert(result, "status").to.equal(204);
  });

  it('should delete item', function() {
    var result = del(location).then(function(res) {
      return get(location);
    });
    return expect(result).to.eventually.be.rejectedWith('Not Found');
  });
});

/*
 * Toolkit HTTP-related helper functions 
 */
 
// POST requests
function post(url, data) {
  return request.post(url)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(data)
    .end();
}

// GET requests
function get(url) {
  return request.get(url)
    .set('Accept', 'application/json')
    .end();
}

// DELETE requests
function del(url) {
  return request.del(url).end();
}

// UPDATE requests
function update(url, method, data) {
  return request(method, url)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(data)
    .end();
}

// Takes a promise (from HTTP functions) and resolves property related to the HTTP response
// uses Chai ad promised, eventually and deep functions
function assert(result, prop) {
  return expect(result).to.eventually.have.deep.property(prop)
}
