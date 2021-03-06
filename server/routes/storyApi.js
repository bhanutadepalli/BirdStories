var express = require('express');
var api = express.Router();
var storyDb = require('../dbFetch/storyDB.js');
var AWS = require('aws-sdk');
var fs = require('fs');
var RateLimit = require('express-rate-limit');
var BlockedStore = require('../utils/blockedStore.js');
var UserAnalyticsUtils = require('../utils/userAnalyticsUtils.js');

const conn = require('../utils/connections.js');
const error = {
  code:'BS101',
  msg:'Internal Error'
}

const alreadyUpdated = {
  code:'BS102',
  msg:'alreadyUpdated'
}

var hackedIPStore = new BlockedStore()

var hackHandler = function (req, res) {
  hackedIPStore.addIp(req.ip)
  res.format({
    html: function(){
      res.status(429).end("Your ip is temporarily blocked. Contact storyboard@sukatha.com");
    },
    json: function(){
      res.status(429).json({ message: "Your ip is temporarily blocked. Contact storyboard@sukatha.com"});
    }
  });
}


var limiter = new RateLimit({
  windowMs: 60*1000, // 15 minutes
  delayMs: 0,
  max: 15, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after two hours",
  handler:hackHandler
});

var hackedIPStore = new BlockedStore()

var hackHandler = function (req, res) {
  hackedIPStore.addIp(req.ip)
  res.format({
    html: function(){
      res.status(429).end("Your ip is temporarily blocked. Contact storyboard@sukatha.com");
    },
    json: function(){
      res.status(429).json({ message: "Your ip is temporarily blocked. Contact storyboard@sukatha.com"});
    }
  });
}


api.all('/*', function(req, res, next) {
  if(hackedIPStore.shouldBlockIp(req.ip)){
    hackedIPStore.print()
    res.status(429).end("Your ip is temporarily blocked. Contact storyboard@sukatha.com");
  }else{
    next();  // call next() here to move on to next middleware/router
  }
})

/* GET home page. */
api.route('/search')
  .get(function(req, res){
      const searchString = req.query.q
      searchByNames(searchString,function(stories){
        var filtered = stories.slice(0, 3);
        res.send(filtered);
      })
  })

api.route('/filters')
  .get(function(req, res){
      var filters = ['comedy','drama','romance','thriller','suspense','fantasy']
      res.send(filters);
  })

api.route('/content/:authorId/:name')
  .get(function(req, res){
    // var filepath = __dirname + '/story.json';
    // fs.readFile(filepath, "utf8", function(err, data){
    //   if(err){
    //     console.log(err);
    //   }
    //  var story = JSON.parse(data);
    //  res.send(story);
    // });

    var s3 = new AWS.S3({ region:"ap-south-1","signatureVersion":"v4",endpoint:"https://s3.ap-south-1.amazonaws.com"});
    var bucketName = 'bsstory';
    var keyName = req.params.authorId+'/'+req.params.name+'/story.json';
    var params = {Bucket: bucketName, Key: keyName};
    s3.getObject(params, function(err, data) {
      if (err){
        res.send(err)
      }else {
        var fileContents = data.Body.toString();
        var json = JSON.parse(fileContents);
        res.send(json);
      }
    });
  })

api.route('/:authorId/:id')
  .get(function(req, res){
      const authorId = req.params.authorId
      const id = Number(req.params.id)

      if(!authorId || !id){
          res.send(error);
      }
      getStory(authorId,id,function(stories){
        if(stories && stories.length > 0){
            res.send(stories[0]);
        }else {
            res.send({});
        }
      })
  })

api.route('/:authorId')
  .get(function(req, res){
      const authorId = req.params.authorId
      getAuthorStories(authorId,function(stories){
        res.send(stories);
      })
  })

api.route('/')
  .get(function(req, res){
      var tsFilter = req.query.lastts;
      if(!tsFilter){
        tsFilter = Date.now();
      }else{
        tsFilter = Number(tsFilter);
      }

      var genre = req.query.genre;
      var limit = req.query.limit;
      getStories(tsFilter,genre,limit,function(stories){
        res.send(stories);
      })
  })
  .post(limiter,function (req, res) {
      var id = req.body.id;
      var attr = req.body.updateAttr;
      switch(attr){
        case 'social':
          var key = req.body.updateKey;
          if(key === "reads" || key === "likes"){
            var storyId = id["author"]+id["timestamp"]+key
            if(req.session[storyId]){
              res.send(alreadyUpdated);
              return;
            }else{
              req.session[storyId] = true;
            }
          }
          updateSocialElements(id,key,function(result){
            res.send(result);
          })
          break;
        default:
          res.send(error); //give proper error case
      }
    })

api.route('*')
  .get(function(req, res){
      res.send('no api found');
  })

function getStory(authorId,id,callback){
  const docClient = conn.getDocClient();
  var params = {
      KeyConditionExpression: "#author = :authorId and #ts = :timestamp",
      ExpressionAttributeNames:{
          "#author" : "author",
          "#ts" : "timestamp"
      },
      ExpressionAttributeValues: {
          ":authorId":authorId,
          ":timestamp":id
      }
  };
  storyDb.query(params,docClient,callback);
}
function getAuthorStories(authorId,callback){
    const docClient = conn.getDocClient();
    var params = {
        KeyConditionExpression: "author = :id",
        ExpressionAttributeValues: {
            ":id":authorId
        },
        Limit: 10,
        ScanIndexForward:false
    };
    storyDb.query(params,docClient,callback);
}

function getStories(ts,genre,limit,callback){
    const docClient = conn.getDocClient();
    var params = {
        IndexName: "RecentIndex",
        KeyConditionExpression: "#l = :lang and #ts < :timestamp",
        ExpressionAttributeNames:{
            "#l": "lang",
            "#ts" : "timestamp"
        },
        ExpressionAttributeValues: {
            ":lang":"telugu",
            ":timestamp":ts
        },
        ScanIndexForward:false,
        Limit:9
    };

    if(limit){
      params.Limit = limit
    }

    if(genre){
      params.FilterExpression = "contains(#genre, :v_sub)"
      params.ExpressionAttributeNames["#genre"] = "genre"
      params.ExpressionAttributeValues[":v_sub"] = genre

      if(genre === 'thriller' || genre === 'fantasy'){
        params.Limit = 100
      }

    }



     storyDb.query(params,docClient,callback);
}

function searchByNames(sub,callback){
    const docClient = conn.getDocClient();
    var params = {
        IndexName: "RecentIndex",
        KeyConditionExpression: "#l = :lang",
        FilterExpression: "contains(#name, :v_sub)",
        ExpressionAttributeNames:{
            "#l": "lang",
            "#name": "name"
        },
        ExpressionAttributeValues: {
            ":lang":"telugu",
            ":v_sub":sub
        },
        ScanIndexForward:false
    };
    storyDb.query(params,docClient,callback);

  //   var params = {
  //       FilterExpression: "contains(#name, :v_sub)",
  //       ExpressionAttributeNames:{
  //           "#name": "name"
  //       },
  //       ExpressionAttributeValues: {
  //           ":v_sub":sub
  //       }
  //   };
  //  storyDb.scan(params,docClient,callback);

}

function updateSocialElements(id,element,callback){
    const docClient = conn.getDocClient();
    function generalSuccess(data){
      //console.log(data,id)
    }

    function socialSuccess(data){
        var responseData = data.Attributes;
        callback(responseData);
        const score = getScore(responseData.social,id.timestamp,responseData.time);
        updateScore(id,score,docClient,generalSuccess);

        if(id.user && id.user.email){
          UserAnalyticsUtils.update(id,responseData,element,generalSuccess)
        }
    }

    updateSocial(id,element,docClient,socialSuccess)


}

function updateSocial(id,element,docClient,callback){

  var params = {
            Key: {
                author : id["author"],
                timestamp : id["timestamp"]
            },
            UpdateExpression: "ADD social.#counter :incva",
            ExpressionAttributeNames:{
                "#counter":element
            },
            ExpressionAttributeValues:{
                ":incva":1
            },
            ReturnValues:"ALL_NEW"
        };


  storyDb.update(params,docClient,callback);
}

function updateScore(id,value,docClient,callback){
  var params = {
            Key: {
                author : id["author"],
                timestamp : id["timestamp"]
            },
            UpdateExpression: "SET score = :val",
            ExpressionAttributeValues:{
                ":val":value
            },
            ReturnValues:"UPDATED_NEW"
        };

  storyDb.update(params,docClient,callback);
}

function getScore(social, timestamp,time) {
  var views = social.views;
   var percent = 0.15
   if(timestamp < 1501545600000){
     percent = 0.10
   }

   var viewsPercent = 0.45

   if(time <= 1){
     viewsPercent = 0.75
   }else if(time <= 2){
     viewsPercent = 0.45
   }else if(time <= 5){
     viewsPercent = 0.30
   }else if(time <= 9){
     viewsPercent = 0.25
   }else{
     viewsPercent = 0.22
   }

   var score1 =  social.reads / (views * viewsPercent)
   var score2 =  (social.likes + (social.shares * 1.2) + social.comments) / (views * percent)

   if(score2 > 1.25){
     score2 = 1.25
   }

   var score = ((score1*6)+(score2*4))/10
   score = score * 100

   if(score > 100){
     score = 100
   }

  return score
}


module.exports = api;
