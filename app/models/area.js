var mongoose = require('mongoose');
var Schema = mongoose.Schema;
require('./element');
var Element = mongoose.model('Element');


var AreaSchema = new Schema({
    background  : String,
    tokens      : [{type: Schema.Types.ObjectId, ref: 'Token'}]
});
/**
 * Methods
 *
 * @type {{}}
 */
AreaSchema.methods = {
    setTokens: function(tokens){
        if (util.isArray(tokens)) {
            this.tokens = tokens;
            return this;
        }
    }
};
var Area = Element.discriminator('Area', AreaSchema);