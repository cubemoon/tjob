
var path = require('path')
  , Tag = require('../models/tag')
  , Job = require('../models/job')
  , EventProxy = require('../lib/eventproxy').EventProxy
  , userauth = require('./user')
  , util = require('../public/js/util');


module.exports = function(app){
    app.get('/tag/create', userauth.require_author, function(req, res){
        res.render('tag/edit.html', {tag: {}});
    });
    app.post('/tag/create', userauth.require_author, function(req, res, next){
        var tag = req.body;
        Tag.insert(tag, function(err, result) {
            if(err) {
                return next(err);
            }
            if(result && result.insertId) {
                return res.redirect('/tag/' + result.insertId);
            }
            res.redirect('/');
        });
    });
    app.get('/tag/:id', function(req, res, next){
        var tag_id = req.params.id;
        var ep = new EventProxy();
        ep.assign('tag', 'jobs', function(tag_args, jobs_args) {
            var err = tag_args[0] || jobs_args[0];
            if(err) {
                return next(err);
            }
            res.render('index', {
                tag: tag_args[1],
                jobs: jobs_args[1]
            });
        });
        Tag.get(tag_id, function(err, tag) {
            ep.emit('tag', err, tag);
        });
        var pagging = util.get_pagging(req)
          , user = req.session.user;
        Tag.get_jobs(tag_id, pagging, function(err, jobs) {
            var job_ids = null;
            if(user && jobs && jobs.length > 0) {
                job_ids = [];
                for(var i = 0, len = jobs.length; i < len; i++) {
                    job_ids.push(jobs[i].id);
                }
            }
            if(user && job_ids) {
                Job.check_likes(user.user_id, job_ids, function(_, likes){
                    if(likes) {
                        for(var i = 0, len = jobs.length; i < len; i++) {
                            var job = jobs[i];
                            job.user_like = likes[job.id];
                        }
                    }
                    ep.emit('jobs', err, jobs);
                });
            } else {
                ep.emit('jobs', err, jobs);
            }
        });
    });
    app.get('/tag/:id/edit', userauth.require_author, function(req, res, next){
        Tag.get(req.params.id, function(err, tag) {
            if(err) {
                return next(err);
            }
            res.render('tag/edit', {tag: tag});
        });
    });
    app.post('/tag/:id', userauth.require_author, function(req, res, next){
        var tag = req.body;
        var tag_id = req.params.id;
        Tag.update(tag_id, tag, function(err, result) {
            if(err) {
                return next(err);
            }
            if(result) {
                return res.redirect('/tag/' + tag_id);
            }
            res.redirect('/');
        });
    });
    app.get('/tags', function(req, res) {
        Tag.list(function(err, tags) {
            tags = tags || [];
            res.send(JSON.stringify(tags));
        });
    });
};