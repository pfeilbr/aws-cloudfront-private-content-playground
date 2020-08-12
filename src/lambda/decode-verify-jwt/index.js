"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const util_1 = require("util");
const Axios = __importStar(require("axios"));
const jsonwebtoken = __importStar(require("jsonwebtoken"));
const jwkToPem = require("jwk-to-pem");
const cognitoPoolId = process.env.COGNITO_POOL_ID || "";
if (!cognitoPoolId) {
    throw new Error("env var required for cognito pool");
}
const cognitoIssuer = `https://cognito-idp.us-east-1.amazonaws.com/${cognitoPoolId}`;
let cacheKeys;
const getPublicKeys = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!cacheKeys) {
        const url = `${cognitoIssuer}/.well-known/jwks.json`;
        const publicKeys = yield Axios.default.get(url);
        cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
            const pem = jwkToPem(current);
            agg[current.kid] = { instance: current, pem };
            return agg;
        }, {});
        return cacheKeys;
    }
    else {
        return cacheKeys;
    }
});
const verifyPromised = util_1.promisify(jsonwebtoken.verify.bind(jsonwebtoken));
const handler = (request) => __awaiter(void 0, void 0, void 0, function* () {
    let result;
    try {
        console.log(`user claim verfiy invoked for ${JSON.stringify(request)}`);
        const token = request.token;
        const tokenSections = (token || "").split(".");
        if (tokenSections.length < 2) {
            throw new Error("requested token is invalid");
        }
        const headerJSON = Buffer.from(tokenSections[0], "base64").toString("utf8");
        const header = JSON.parse(headerJSON);
        const keys = yield getPublicKeys();
        const key = keys[header.kid];
        if (key === undefined) {
            throw new Error("claim made for unknown kid");
        }
        const claim = (yield verifyPromised(token, key.pem));
        const currentSeconds = Math.floor(new Date().valueOf() / 1000);
        if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
            throw new Error("claim is expired or invalid");
        }
        if (claim.iss !== cognitoIssuer) {
            throw new Error("claim issuer is invalid");
        }
        if (claim.token_use !== "access") {
            throw new Error("claim use is not access");
        }
        console.log(`claim confirmed for ${claim.username}`);
        result = {
            userName: claim.username,
            clientId: claim.client_id,
            isValid: true,
        };
    }
    catch (error) {
        result = { userName: "", clientId: "", error, isValid: false };
    }
    return result;
});
exports.handler = handler;
