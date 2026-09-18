'use client';

const isNode = typeof window === 'undefined';

const isClearAccessTokenRequested = () =>
	!isNode && new URLSearchParams(window.location.search).get("clear_access_token") === 'true';

const clearStoredAccessToken = () => {
	window.localStorage.removeItem('base44_access_token');
	window.localStorage.removeItem('token');
}

const getAppParams = () => {
	if (isClearAccessTokenRequested()) {
		clearStoredAccessToken();
	}
	return {
		appId: process.env.NEXT_PUBLIC_BASE44_APP_ID,
		token: getAccessToken(),
		functionsVersion: process.env.NEXT_PUBLIC_BASE44_FUNCTIONS_VERSION,
		appBaseUrl: process.env.NEXT_PUBLIC_BASE44_APP_BASE_URL,
	}
}

export const appParams = {
	...getAppParams()
}
