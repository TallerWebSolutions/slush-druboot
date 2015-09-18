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
var git = require('nodegit');
var install = require('gulp-install');
var conflict = require('gulp-conflict');
var replace = require('gulp-replace');
var rename = require('gulp-rename');

var replaceMap = {
  'humanName': '***DRUPAL_HUMAN_NAME***',
  'siteName': '***DRUPAL_SITE_NAME***',
  'machineName': '***DRUPAL_MACHINE_NAME***',
  'devIP': '***CHANGE.THIS.IP.ADDR***'
};

gulp.task('default', function (done) {
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

  // @TODO: automitize selection of roles to install.

  inquirer.prompt(prompts, function (answers) {
    build(answers, done);
  });
});

/**
 * Build Druboot project.
 */
function build(config, done) {
  rm('-rf', __dirname + '/druboot-clone');

  var cloning = git.Clone.clone('https://github.com/TallerWebSolutions/druboot.git', __dirname + '/druboot-clone');

  // Parse and copy.
  cloning.then(copy);

  // Failure handling.
  cloning.catch(done);

  /**
   * Copy druboot files to final directory.
   */
  function copy() {
    rm('-rf', __dirname + '/druboot-clone/.git');

    var stream = gulp.src(__dirname + '/druboot-clone/**/*');

    Object.keys(config).forEach(function (key) {
      stream = stream.pipe(replace(replaceMap[key], config[key]));
    });

    stream
      .pipe(conflict(config.dest))
      .pipe(gulp.dest(config.dest))
      .pipe(install())
      .on('end', function () {
        done();
      })
      .resume();
  }
}

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
