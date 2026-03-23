// @ts-nocheck
import type { PageLoad } from './$types';

export const load = ({ url }: Parameters<PageLoad>[0]) => ({
	code: url.searchParams.get('code'),
	state: url.searchParams.get('state'),
	error: url.searchParams.get('error')
});
