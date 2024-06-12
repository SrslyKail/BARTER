const Joi = require("joi");

const ratingSchema = Joi.number().min(1).max(5).required();
const usernameSchema = Joi.string().alphanum().max(20).required();
const emailSchema = Joi.string()
  .email({
    minDomainSegments: 2,
    tlds: { allow: ["com", "net", "ca"] },
  })
  .required();
const passwordSchema = Joi.string().max(20).required();

const userSchema = Joi.object().keys({
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema,
});

const objectIdSchema = Joi.object({
  objId: Joi.string().hex({ prefix: false }).length(24).required(),
});

module.exports = {
  ratingSchema,
  usernameSchema,
  emailSchema,
  passwordSchema,
  userSchema,
  objectIdSchema,
};
