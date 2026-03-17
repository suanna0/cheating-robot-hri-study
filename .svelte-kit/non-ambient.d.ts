
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/api" | "/api/choice" | "/api/events" | "/api/join" | "/api/reset" | "/api/resolve" | "/api/theme" | "/play";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/admin": Record<string, never>;
			"/api": Record<string, never>;
			"/api/choice": Record<string, never>;
			"/api/events": Record<string, never>;
			"/api/join": Record<string, never>;
			"/api/reset": Record<string, never>;
			"/api/resolve": Record<string, never>;
			"/api/theme": Record<string, never>;
			"/play": Record<string, never>
		};
		Pathname(): "/" | "/admin" | "/api/choice" | "/api/events" | "/api/join" | "/api/reset" | "/api/resolve" | "/api/theme" | "/play";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/fonts/FragmentMono-Regular.ttf" | "/fonts/PPKyoto-MediumItalic.otf" | "/fonts/PPKyoto-Thin.otf" | "/robots.txt" | string & {};
	}
}