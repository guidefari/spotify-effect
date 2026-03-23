import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => ({
	code: url.searchParams.get('code'),
	state: url.searchParams.get('state'),
	error: url.searchParams.get('error')
});
