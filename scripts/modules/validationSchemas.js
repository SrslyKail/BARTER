const Joi = require("joi");

const ratingSchema = Joi.number().min(1).max(5).required();
const passwordSchema = Joi.string().max(20).required();

// TODO: CB: Does Joi have inheritence? Can we extend passwordSchema so userSchema inherits from it?
const userSchema = Joi.object({
  username: Joi.string().alphanum().max(20).required(),

  password: Joi.string().max(20).required(),

  email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ["com", "net", "ca"] },
    })
    .required(),
});

const objectIdSchema = Joi.object({
  objId: Joi.string().hex({ prefix: false }).length(24).required(),
});

module.exports = { ratingSchema, userSchema, passwordSchema, objectIdSchema };
