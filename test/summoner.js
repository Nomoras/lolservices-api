/**
  Tests for the summoner endpoints of the backend service
**/

// Assign to testing db
process.env.NODE_ENV = 'test';

// Testing dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../server');
var config = require('config');
var should = chai.should();
var MongoClient = require('mongodb').MongoClient;

chai.use(chaiHttp);

// Testing vars
var db;
const AUTH_FIELD = "auth";
const AUTH_KEY = "spookyghost";

const COL_SUMMONER = "summoners";
const TEST_SUMMONER = {
  "name" : "SquareOne",
  "id" : 19481879
};
const EXISTING_SUMMONER = {
  "name" : "Chanban",
  "id" : 19244247
}

const NON_EXISTENT_SUMMONER = {
  "name" : "Aekyo",
  "id" : 23184207
}

describe("Summoner", () => {
  before((done) => {
    // Setup mongodb connection
    MongoClient.connect(config.get("DB_PATH")).then((connection) => {
      db = connection;
      done();
    });
  });

  beforeEach((done) => {
    // Clear summoner collection
    db.dropCollection(COL_SUMMONER).then((res) => {
      // Add one summoner for existing case
      chai.request(server)
        .post("/api/summoner")
        .set(AUTH_FIELD, AUTH_KEY)
        .set("Content-Type", "application/json")
        .send(EXISTING_SUMMONER)
        .then((res) => {
          done();
        });
    });
  });

  describe("/POST summoner", () => {
    it("should allow creation of new summoner", (done) => {
      // Verify response
      chai.request(server)
        .post("/api/summoner")
        .set(AUTH_FIELD, AUTH_KEY)
        .set("Content-Type", "application/json")
        .send(TEST_SUMMONER)
        .then((res) => {
          res.should.have.status(200);
          res.text.should.equal('Summoner added');

          // Verify db status
          db.collection(COL_SUMMONER).find({"id" : TEST_SUMMONER.id}).toArray().then((res) => {
            res.length.should.equal(1);
            done();
          });
        });
    });

    it("should not allow creation of existing summoner", (done) => {
      // Verify response
      chai.request(server)
        .post("/api/summoner")
        .set(AUTH_FIELD, AUTH_KEY)
        .set("Content-Type", "application/json")
        .send(EXISTING_SUMMONER)
        .then((res) => {
          res.should.have.status(200);
          res.text.should.equal('ERROR: Summoner already exists');

          // Verify no duplicate was added in db
          db.collection(COL_SUMMONER).find({"id" : EXISTING_SUMMONER.id}).toArray().then((res) => {
            res.length.should.equal(1);
            done();
          })
        })
    });

    it("should not allow unauthenticated requests", (done) => {
      // Verify forbidden code
      chai.request(server)
        .post("/api/summoner")
        .set("Content-Type", "application/json")
        .send(TEST_SUMMONER)
        .then((res) => {
          res.should.have.status(403);
          done();
        }, (err) => {
          err.should.have.status(403);
          done();
        })
    });
  })

  describe("/DELETE summoner", () => {
    it("should allow deletion of existing summoner", (done) => {
      chai.request(server)
        .delete("/api/summoner/" + EXISTING_SUMMONER.name)
        .set(AUTH_FIELD, AUTH_KEY)
        .set("Content-Type", "application/json")
        .then((res) => {
          res.should.have.status(200);
          res.text.should.equal('Summoner deleted');

          // Verify nothing is found in db
          db.collection(COL_SUMMONER).find({"id" : EXISTING_SUMMONER.id}).toArray().then((res) => {
            res.length.should.equal(0);
            done();
          });
        })
    });

    it("should properly handle deletion of non-existing summoner", (done) => {
      chai.request(server)
        .delete("/api/summoner/" + NON_EXISTENT_SUMMONER.name)
        .set(AUTH_FIELD, AUTH_KEY)
        .set("Content-Type", "application/json")
        .then((res) => {
          res.should.have.status(200);
          res.text.should.equal('ERROR: Summoner does not exist');
          done();
        })
    });

    it("should deny access to unauthenticated requests", (done) => {
      chai.request(server)
        .delete("/api/summoner" + EXISTING_SUMMONER.name)
        .set("Content-Type", "application/json")
        .then((res) => {
          fail();
        }).catch((err) => {
          err.should.have.status(403);
          done();
        });
    });
  })

});
