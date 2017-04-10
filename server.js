var mongoose = require('mongoose');
var s3fs = require("s3fs");
var fs = require("fs");
var compress = require("compression");
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var xml2js = require('xml2js');
var async = require("async");
var _ = require('lodash');
var request = require("request");
var session = require("express-session");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var agenda = require('agenda')({
  db: {
    address: 'mongodb://admin:admin@ds149040.mlab.com:49040/show-companion',
    collection: 'jobs',
    options: {
      server: {
        auto_reconnect: true
      }
    }
  }
});
var sugar = require('sugar/date');
sugar.extend();
var mailgun = require("nodemailer-mailgun-transport");
var app = express();
var User = require("./server/models/UserSchema");
var Show = require("./server/models/ShowSchema");
app.set('port', process.env.PORT || 3000);
app.use(compress());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); //{maxAge: 86400000}

var s3fsImpl = new s3fs('elasticbeanstalk-us-west-2-383447803422', {
  accessKeyId: 'AKIAJHDODFYMXY6PWRNQ',
  secretAccessKey: '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'
});

passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get('/api/shows', function(req, res, next) {
  var query = Show.find();
  if (req.query.genre) {
    query.where({
      genre: req.query.genre
    });
  }
  else if (req.query.alphabet) {
    query.where({
      name: new RegExp('^' + '[' + req.query.alphabet + ']', 'i')
    })
  }
  else {
    query.limit(25);
  }
  query.exec(function(err, shows) {
    if (err) return next(err);

    res.send(shows);
  });
});

app.get('/api/shows/:id', function(req, res, next) {
  Show.findById(req.params.id, function(err, show) {
    if (err) return next(err);

    res.send(JSON.stringify(show));
  });
});


app.post('/api/shows', function(req, res, next) {
  var apiKey = '9EF1D1E7D28FDA0B';
  var parser = xml2js.Parser({
    explicitArray: false,
    normalizeTags: true
  });
  var seriesName = req.body.showName
    .toLowerCase()
    .replace(/ /g, '_')
    /*.replace(/[^w-]+/g, '');*/
  console.log("seriesName :" + seriesName)
  async.waterfall([function(callback) {
      console.log("first waterfall")
      request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function(err, response, body) {
        if (err) {
          return next(err);
        }
        parser.parseString(body, function(err, result) {
          if (!result.data.series) {
            res.send(404, JSON.stringify({
              message: seriesName + ' was not found'
            }));
          }
          var seriesId = result.data.series.seriesid || result.data.series[0].seriesid;
          console.log("seriesId" + seriesId)
          callback(err, seriesId);


        });
      })
    },
    function(seriesid, callback) {

      request.get('http://thetvdb.com/api/9EF1D1E7D28FDA0B/series/' + seriesid + '/all/en.xml', function(err, response, body) {
        if (err) return next(err);
        parser.parseString(body, function(err, result) {
          var series = result.data.series;
          var episodes = result.data.episode;
          var show = new Show({
            _id: series.id,
            name: series.seriesname,
            airsDayOfWeek: series.airs_dayofweek,
            airsTime: series.airs_time,
            firstAired: series.firstaired,
            genre: series.genre.split('|').filter(Boolean),
            network: series.network,
            overview: series.overview,
            rating: series.rating,
            ratingCount: series.ratingcount,
            runtime: series.runtime,
            status: series.status,
            poster: series.poster,
            episodes: []
          });
          _.each(episodes, function(episode) {
            show.episodes.push({
              season: episode.seasonnumber,
              episodeNumber: episode.episodenumber,
              episodeName: episode.episodename,
              firstAired: episode.firstaired,
              overview: episode.overview
            });
          });
          callback(err, show);
        });
      });
    },
    function(show, callback) {
      var url = 'http://thetvdb.com/banners/' + show.poster;
      request({
        url: url,
        encoding: null
      }, function(err, response, body) {
        //show.poster = 'data:' + response.headers['content-type'] + ';base64, ' + body.toString('base64');

        s3fsImpl.writeFile(show.poster, body)
          .then(function() {
            console.log('https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-383447803422' + show.poster);
            show.poster = 'https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-383447803422/' + show.poster;
            callback(err, show);
          })

      });
    }
  ], function(err, show) {
    if (err) return next(err);
    show.save(function(err) {
      if (err) {
        if (err.code == 11000) {
          return res.send(409, {
            message: show.name + ' already exists'
          });
        }
        return next(err);
      }
      var alertDate = sugar.Date.create('Next ' + show.airsDayOfWeek + ' at ' + show.airsTime).rewind({
        hour: 2
      });
      agenda.schedule(alertDate, 'send email alert', show.name).repeatEvery('1 week');
      res.send(200);
    });
  });
});
passport.use(new LocalStrategy({
  usernameField: 'email'
}, function(email, password, done) {
  User.findOne({
    email: email
  }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false);
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if (isMatch) return done(null, user);
      return done(null, false);
    });
  });
}));

app.use(session({
  secret: 'asdasd123e12dasdasd'
}));
app.use(passport.initialize());
app.use(passport.session());

app.post('/api/login', passport.authenticate('local'), function(req, res) {
  res.cookie('user', JSON.stringify(req.user));
  res.send(req.user);
});

app.post('/api/signup', function(req, res, next) {
  var user = new User({
    email: req.body.email,
    password: req.body.password
  });
  user.save(function(err) {
    if (err) return next(err);
    res.send(200);
  });
});

app.get('/api/logout', function(req, res, next) {
  req.logout();
  res.send(200);
});

app.post('/api/suscribe', function(req, res, next) {
  Show.findById(req.body.showId, function(err, show) {
    console.log(req.body.showId);
    if (err) return next(err);
    if (!show) res.send(JSON.stringify({
      message: 'The show was not found'
    }));
    show.subscribers.push(req.user._id);
    show.save(function(err) {
      if (err) return next(err);
      res.send(200);
    })
  })
});

app.post('/api/unsuscribe', function(req, res, next) {
  Show.findById(req.body.showId, function(err, show) {
    console.log(req.body.showId);
    if (err) return next(err);
    if (!show) res.send(JSON.stringify({
      message: 'The show was not found'
    }));
    var index = show.subscribers.indexOf(req.user._id);
    show.subscribers.splice(index, 1);
    show.save(function(err) {
      if (err) return next(err);
      res.send(200);
    })
  })
});
app.get('*', function(req, res) {
  res.redirect('/#!' + req.originalUrl);
});
app.use(function(err, req, res, next) {
  console.log(err.stack);
  res.send(500, JSON.stringify({
    message: err.message
  }));
});
mongoose.connect('mongodb://admin:admin@ds149040.mlab.com:49040/show-companion', function(err) {
  if (err) console.log("Trouble connectig  with databse");
  else console.log("Connected to database");
});
app.listen(app.get('port'), function() {
  console.log('Express server listening on port: ' + app.get('port'));
})


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) next();
  else res.send(401);
}
agenda.define('send email alert', function(job, done) {
  Show.findOne({
    name: job.attrs.data
  }).populate('subscribers').exec(function(err, show) {
    var emails = show.subscribers.map(function(user) {
      return user.email;
    });

    var upcomingEpisode = show.episodes.filter(function(episode) {
      return new Date(episode.firstAired) > new Date();
    })[0];

    var auth = {
      auth: {
        api_key: 'key-8042677eb9a30aad077d4ac0278267ae',
        domain: 'app5e2ddfde8a004ceb88d4f081d5f389e8.mailgun.org'
      }
    }
    var nodemailerMailgun = mailgun.createTransport(mailgun(auth));
    var mailOptions = {
      from: 'Notifier <foo@showcompanion.com>',
      to: emails.join(','),
      subject: show.name + ' is starting soon!',
      text: show.name + ' starts in less than 2 hours on ' + show.network + '.\n\n' +
        'Episode ' + upcomingEpisode.episodeNumber + ' Overview\n\n' + upcomingEpisode.overview
    }
    nodemailerMailgun.sendMail(mailOptions, function(err, info) {
      if (err) console.log(err);
      console.log(err);
      done();
    })
  })
});
agenda.on('ready', function() {
  agenda.start();
});
agenda.on('start', function(job) {
  console.log("Job %s starting", job.attrs.name);
});

agenda.on('complete', function(job) {
  console.log("Job %s finished", job.attrs.name);
});
