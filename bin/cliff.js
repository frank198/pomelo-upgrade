/*
 * cliff.js: CLI output formatting tools: "Your CLI Formatting Friend".
 *
 * (C) 2010, Charlie Robbins & the Contributors
 *
 */

const colors = require('colors');
const cliff = exports;
//
// ### function extractFrom (obj, properties)
// #### @obj {Object} Object to extract properties from.
// #### @properties {Array} List of properties to output.
// Creates an array representing the values for `properties` in `obj`.
//
cliff.extractFrom = function(obj, properties) {
    return properties.map(function(p) {
        return obj[p];
    });
};

//
// ### function columnMajor (rows)
// #### @rows {ArrayxArray} Row-major Matrix to transpose
// Transposes the row-major Matrix, represented as an array of rows,
// into column major form (i.e. an array of columns).
//
cliff.columnMajor = function(rows) {
    const columns = [];

    rows.forEach(function(row) {
        for (let i = 0; i < row.length; i += 1) {
            if (!columns[i]) {
                columns[i] = [];
            }

            columns[i].push(row[i]);
        }
    });

    return columns;
};

//
// ### arrayLengths (arrs)
// #### @arrs {ArrayxArray} Arrays to calculate lengths for
// Creates an array with values each representing the length
// of an array in the set provided.
//
cliff.arrayLengths = function(arrs) {
    let i, lengths = [];
    for (i = 0; i < arrs.length; i += 1) {
        lengths.push(longestElement(arrs[i].map(cliff.stringifyLiteral)));
    }
    return lengths;
};

//
// ### function stringifyRows (rows, colors)
// #### @rows {ArrayxArray} Matrix of properties to output in row major form
// #### @colors {Array} Set of colors to use for the headers
// Outputs the specified `rows` as fixed-width columns, adding
// colorized headers if `colors` are supplied.
//
cliff.stringifyRows = function(rows, colors, options) {
    const output = [];
    options = options || {};
    options.columnSpacing = options.columnSpacing || 2;

    const columns = cliff.columnMajor(rows);
    const lengths = cliff.arrayLengths(columns);

    function stringifyRow(row, colorize) {
        let rowText = '';
        for (let i = 0, l = row.length; i < l; i += 1) {
            let item = cliff.stringifyLiteral(row[i]);

            if (colorize) {
                item = item[colors[i]] || item[colors[colors.length - 1]] || item;
            }

            const length = realLength(item);
            const padding = length < lengths[i] ? lengths[i] - length + options.columnSpacing : options.columnSpacing ;
            rowText += item + new Array(padding).join(' ');
        }
        output.push(rowText);
    }

    // If we were passed colors, then assume the first row
    // is the headers for the rows
    // if (colors) {
    //     const headers = rows.splice(0, 1)[0];
    //     stringifyRow(headers, true);
    // }

    rows.forEach(function(row) {
        stringifyRow(row, true);
    });

    return output.join('\n');
};

//
// ### function rowifyObjects (objs, properties, colors)
// #### @objs {Array} List of objects to create output for
// #### @properties {Array} List of properties to output
// #### @colors {Array} Set of colors to use for the headers
// Extracts the lists of `properties` from the specified `objs`
// and formats them according to `cliff.stringifyRows`.
//
cliff.stringifyObjectRows = cliff.rowifyObjects = function(objs, properties, colors, options) {
    const rows = [properties].concat(objs.map(function(obj) {
        return cliff.extractFrom(obj, properties);
    }));

    return cliff.stringifyRows(rows, colors, options);
};

cliff.stringifyLiteral = function stringifyLiteral(literal) {
    switch (cliff.typeOf(literal)) {
        case 'number' : return literal + '';
        case 'null' : return 'null';
        case 'undefined': return 'undefined';
        case 'boolean' : return literal + '';
        default : return literal;
    }
};

cliff.typeOf = function typeOf(value) {
    let s = typeof (value),
            types = [Object, Array, String, RegExp, Number, Function, Boolean, Date];

    if (s === 'object' || s === 'function') {
        if (value) {
            types.forEach(function(t) {
                if (value instanceof t) {
                    s = t.name.toLowerCase();
                }
            });
        } else {
            s = 'null';
        }
    }

    return s;
};

function realLength(str) {
    return ('' + str).replace(/\u001b\[\d+m/g,'').length;
}

function longestElement(a) {
    let l = 0;
    for (let i = 0; i < a.length; i++) {
        const new_l = realLength(a[i]);
        if (l < new_l) {
            l = new_l;
        }
    }

    return l;
}
