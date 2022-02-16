#!/usr/bin/env node
var fs = require('fs')
var args = require('minimist')(process.argv.slice(2))
var Parser = require('i18next-scanner').Parser
var converter = require('i18next-conv')
var glob = require('glob')
var debug = require('debug')('i18next-extract-gettext')

var fileGlob = args.files
var outputFile = args.output
var namespace = args.ns

var parserOptions = {};

if (namespace == undefined) {
    namespace = "translation";
    
    parserOptions = {
    // Include react helpers into parsing
    attr: {
      list: ['data-i18n', 'i18nKey']
    },
    func: {
      list: ['i18next.t', 'i18n.t', 't']
    },
    // Make sure common separators don t break the string
    keySeparator: args.keySeparator || '°°°°°°.°°°°°°',
    nsSeparator: args.nsSeparator || '°°°°°°:°°°°°°',
    pluralSeparator: args.pluralSeparator || '°°°°°°_°°°°°°',
    contextSeparator: args.contextSeparator || '°°°°°°_°°°°°°',
    // Interpolate correctly
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    }
  }
} else {
  parserOptions = {
      debug: true,
      func: {
          list: ['i18next.t', 'i18n.t'],
          extensions: ['.js', '.jsx']
      },
      trans: {
          component: 'Trans',
          i18nKey: 'i18nKey',
          defaultsKey: 'defaults',
          extensions: ['.js', '.jsx'],
          fallbackKey: function(ns, value) {
              return value;
          },
          acorn: {
              ecmaVersion: 2020,
              sourceType: 'module', // defaults to 'module'
              // Check out https://github.com/acornjs/acorn/tree/master/acorn#interface for additional options
          }
      },
      lngs: ['en'],
      ns: [
          'locale',
          namespace
      ],
      defaultLng: 'en',
      defaultNs: 'translation',
      defaultValue: '',
      resource: {
          loadPath: 'i18n/{{lng}}/{{ns}}.json',
          savePath: 'i18n/{{lng}}/{{ns}}.json',
          jsonIndent: 2,
          lineEnding: '\n'
      },
      nsSeparator: true, // namespace separator
      keySeparator: false, // key separator
      interpolation: {
          prefix: '{{',
          suffix: '}}'
      }
  }
}

var parser = new Parser(parserOptions)

if (!fileGlob || !outputFile) {
    console.log('Missing "files" glob or "output" file')
    process.exit(1)
}

debug('Reading in files for glob: ' + fileGlob)
glob(fileGlob, function (err, files) {
    if (err) {
        console.log(err)
        process.exit(1)
    }

    debug('Loading content of ' + files.length + ' files')
    var content = ''
    files.map(function (file) {
        content += fs.readFileSync(file, 'utf-8')
    })

    debug('Parsing translation keys out of content')
    parser.parseFuncFromString(content, parserOptions)
    parser.parseAttrFromString(content, parserOptions)
    var json = parser.get().en[namespace]

    debug('Converting ' + Object.keys(json).length + ' translation keys into gettext')
    converter.i18nextToPot('en', JSON.stringify(json), {quiet: true}).then(function (data) {
        debug('Writing into output file')
        fs.writeFileSync(outputFile, data, 'utf-8')
    })
})
