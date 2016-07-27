#!/bin/sh
":" //# comment; exec /usr/bin/env node --harmony "$0" "$@"

// Forked from: https://github.com/Quramy/typed-css-modules/blob/master/src/cli.js

'use strict';

const path = require('path');
const gaze = require('gaze');
const glob = require('glob');
const yargs = require('yargs');
const chalk = require('chalk');
const DtsCreator  = require('typed-css-modules');
const stylus = require('stylus');
const fs = require('fs');

let yarg = yargs.usage('Create .css.d.ts from CSS modules *.css files.\nUsage: $0 [options] <input directory>')
  .example('$0 src/styles')
  .example('$0 src -o dist')
  .example('$0 -p styles/**/*.icss -w')
  //.detectLocale(false)
  .demand(['_'])
  .alias('o', 'outDir').describe('o', 'Output directory')
  .alias('p', 'pattern').describe('p', 'Glob pattern with css files')
  .alias('w', 'watch').describe('w', 'Watch input directory\'s css files or pattern').boolean('w')
  .alias('h', 'help').help('h')
  .version(() => require('../package.json').version)
let argv = yarg.argv;
let creator;

let writeFile = f => {
  console.log('Loading ' + f);
  fs.readFile(f, 'utf-8', (err, source) => {
    if (err) {
      console.log('[Error] ' + err);
      return;
    }
    console.log('Rendering ' + f);
    stylus.render(source, { filename: f }, (err, css) => {
      if (err) {
        console.log('[Error] ' + err);
        return;
      }
      let cssFile = f + '.css';
      console.log('Writing ' + cssFile);
      fs.writeFile(cssFile, css, 'utf-8', err => {
        if (err) {
          console.log('[Error] ' + err);
          return;
        }
        console.log('Extracting ' + cssFile);
        creator.create(cssFile, null, !!argv.w).then(content => {
          let outFile = f + '.d.ts';
          content.messageList.forEach(message => {
            console.log('[Warn] ' + chalk.red(message));
          });
          fs.writeFile(outFile, content.formatted, 'utf-8', err => {
            if (err) {
              console.log('[Error] ' + err);
            }
            console.log('Wrote ' + chalk.green(outFile));
          });
          fs.unlink(cssFile, err => {
            if (err) {
              console.log('[Error] ' + err);
            }
          });
        })
        .catch(reason => console.log('[Error] ' + reason));
      });
    });
  });
};

let main = () => {
  let rootDir;
  if(argv.h) {
    yarg.showHelp();
    return;
  }

  let searchDir = './';
  if(argv._ && argv._[0]) {
    searchDir = argv._[0];
  }
    
  let filesPattern = path.join(searchDir, argv.p || '**/*.styl');
  rootDir = process.cwd();
  creator = new DtsCreator({rootDir, searchDir, outDir: argv.o});

  if(!argv.w) {
    glob(filesPattern, null, (err, files) => {
      if(err) {
        console.error(err);
        return;
      }
      if(!files || !files.length) return;
      console.log('Found ' + files.length + ' files');
      files.forEach(writeFile);
    });
  }else{
    console.log('Watch ' + filesPattern + '...');
    gaze(filesPattern, function(err, files) {
      this.on('changed', writeFile);
      this.on('added', writeFile);
    });
  }
};

main();

