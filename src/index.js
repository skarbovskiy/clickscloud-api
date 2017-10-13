const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const { URLSearchParams } = require('url');
const crypto = require('crypto');

const BASE_URL = 'http://clickscloud.net/invoice/';

module.exports = function (accountId, secretKey) {
	if (!accountId || !secretKey) {
		throw new Error('bad configuration');
	}
	const service = {
		checkAccount: email => {
			return makeRequest('check', {email});
		},
		refillAccount: (email, amount) => {
			return makeRequest('agent', {email, amount});
		}
	};
	return service;

	function createSignature (payload) {
		let keys = Object.keys(payload).sort();
		let signature = `${accountId}`;
		keys.forEach(key => {
			signature += `${key}=${payload[key]}`;
		});
		signature += `${secretKey}`;
		return crypto.createHash('md5').update(signature).digest('hex');
	}

	function makeRequest (section, payload) {
		if (!section || !payload) {
			return Promise.reject(new Error('request withoud section or payload'));
		}
		payload.sig = createSignature(payload);
		payload.id = accountId;
		const params = new URLSearchParams(payload);
		return request(`${BASE_URL}${section}?${params.toString()}`)
			.then(res => {
				let response = null;
				try {
					response = JSON.parse(res.body);
					if (!response.response) {
						throw new Error('not valid json response');
					}
				} catch (e) {
					let error = new Error('badly formatted response from ClicksCloud');
					error.response = res.body;
					error.statusCode = res.statusCode;
					throw error;
				}
				if (res.statusCode !== 200) {
					throw new Error(response.response.error);
				}
				return response.response;
			});
	}
}
