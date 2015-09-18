/*
 * slush-druboot
 * https://github.com/TallerWebSolutions/slush-druboot
 *
 * Copyright (c) 2015, Lucas Constantino Silva
 * Licensed under the MIT license.
 */

'use strict';

require('shelljs/global')

var inquirer = require('inquirer');
var validator = require('validator');
var chalk = require('chalk');
var cowsay = require('cowsay');
var slug = require('slug');

var gulp = require('gulp');
var install = require('gulp-install');
var conflict = require('gulp-conflict');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var sequence = require('run-sequence');

var replaceMap = {
  'humanName': '***DRUPAL_HUMAN_NAME***',
  'siteName': '***DRUPAL_SITE_NAME***',
  'machineName': '***DRUPAL_MACHINE_NAME***',
  'devIP': '***CHANGE.THIS.IP.ADDR***'
};

var drubootRepoURL = 'https://github.com/TallerWebSolutions/druboot.git';

var config = {};

gulp.task('prompt', function (done) {
  var prompts = [];

  say('Welcome to the awesome (cof cof) ' + chalk.red('Druboot') + ' generator!');

  // Human name:
  prompts.push({
    type: 'input',
    name: 'humanName',
    message: 'Give our project a (human) name:',
    validate: required
  });

  // Site name:
  prompts.push({
    type: 'input',
    name: 'siteName',
    message: 'Give our site a name:',
    default: function (answers) {
      return answers.humanName;
    },
    validate: required
  });

  // Machine name:
  prompts.push({
    type: 'input',
    name: 'machineName',
    message: 'Provide a machine name for the project:',
    default: function (answers) {
      var result = slug(answers.humanName, { lower: true });

      result = validator.ltrim(result, '0123456789 -');
      result = validator.rtrim(result, ' -');

      return result;
    },
    validate: function (input) {
      return input && /^[a-z][a-z-0-9]+[a-z]([a-z-0-9]?[a-z0-9])?$/.test(input) || 'Provide a valid machine name, please.';
    }
  });

  // Destiny:
  prompts.push({
    type: 'input',
    name: 'dest',
    message: 'Where should we create the files?',
    default: function (answers) {
      return './' + answers.machineName;
    }
  });

  // Development IP:
  prompts.push({
    type: 'input',
    name: 'devIP',
    message: 'Provide the IP address for the development environment, if you do have one:',
    validate: function (input) {
      return !input || validator.isIP(input) || 'Please provide a valid IP address or none at all, please.';
    }
  });

  // Setup git:
  prompts.push({
    type: 'confirm',
    name: 'git:init',
    message: 'Should we start git a repository?'
  });

  // Git remote:
  prompts.push({
    type: 'input',
    name: 'git:origin',
    message: 'Tell us the repository url, should you have it already:',
    when: function (answers) {
      return answers['git:init'];
    },
    validate: function (input) {
      return !input || validator.isURL(input);
    }
  });

  // @TODO: automitize selection of roles to install.

  inquirer.prompt(prompts, function (answers) {
    config = answers;
    done();
  });
});

gulp.task('druboot:clone', function (done) {
  rm('-rf', __dirname + '/druboot-clone');
  exec('git clone ' + drubootRepoURL + ' ' + __dirname + '/druboot-clone', function (code, output) {
    rm('-rf', __dirname + '/druboot-clone/.git');
    done(code ? code : null, code ? output : null);
  });
});

gulp.task('build', ['druboot:clone'], function (done) {
  var stream = gulp.src(__dirname + '/druboot-clone/**/*');

  Object.keys(replaceMap).forEach(function (key) {
    stream = stream.pipe(replace(replaceMap[key], config[key]));
  });

  return stream
    .pipe(conflict(config.dest))
    .pipe(gulp.dest(config.dest))
    .pipe(install())
    .on('end', function () { done(); })
    .resume();
});

gulp.task('git:init', ['build'], function (done) {
  cd(config.dest);
  exec('git init');

  if (config['git:origin']) {
    exec('git remote set-url origin ' + config['git:config']);
  }

  done();
});

gulp.task('default', ['prompt'], function (done) {
  var tasks = ['build'];

  // Add Git initialization task.
  if (config['git:init']) tasks.push('git:init');

  sequence(tasks, done);
});


/*
 * HELPERS
 * -------
 */

/**
 * Log with cowsay.
 */
function say(message) {
  console.log(cowsay.say({
    text: message
  }));
}

/**
 * Simple required validation.
 */
function required(input) {
  return input ? true : 'This option is required';
}
