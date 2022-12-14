const util = require('@node-red/util').util

/**
 * Gets a property of an object.
 *
 * Given the object:
 *
 *     {
 *       "pet": {
 *           "type": "cat"
 *       }
 *     }
 *
 * - `pet.type` will return `"cat"`.
 * - `pet.name` will return `undefined`
 * - `pet.properties.this.that` will return `undefined`
 * - `car` will return `undefined`
 * - `car.type`  will return `undefined`
 *
 * @param  {Object} object - the object
 * @param  {String} path - the property expression
 * @return {any} the object property, or undefined if it does not exist
 */
function getObjectProperty (object, path) {
    const msgPropParts = util.normalisePropertyExpression(path, object)
    return msgPropParts.reduce((obj, key) =>
        (obj && obj[key] !== 'undefined') ? obj[key] : undefined, object)
}

/**
 * Gets the size of an object.
 * @param  {Object} blob - the object
 * @return {Number} the size of the object
 */
function getItemSize (blob) {
    let size = 0
    if (blob === null) {
        return 1
    } else if (typeof blob === 'undefined') {
        return 0
    }
    if (typeof blob === 'string') {
        size = blob.length
    } else {
        size = size + JSON.stringify(blob).length
    }
    return size
}

module.exports = {
    getObjectProperty,
    getItemSize
}
