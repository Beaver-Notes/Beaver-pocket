import type { Plugin } from './definitions';
import { WebPlugin } from './web-plugin';
/******** WEB VIEW PLUGIN ********/
export interface WebViewPlugin extends Plugin {
    setServerBasePath(options: WebViewPath): Promise<void>;
    getServerBasePath(): Promise<WebViewPath>;
    persistServerBasePath(): Promise<void>;
}
export interface WebViewPath {
    path: string;
}
export declare const WebView: WebViewPlugin;
export interface CapacitorCookiesPlugin {
    getCookies(options?: GetCookieOptions): Promise<HttpCookieMap>;
    setCookie(options: SetCookieOptions): Promise<void>;
    deleteCookie(options: DeleteCookieOptions): Promise<void>;
    clearCookies(options: ClearCookieOptions): Promise<void>;
    clearAllCookies(): Promise<void>;
}
interface HttpCookie {
    url?: string;
    key: string;
    value: string;
}
interface HttpCookieMap {
    [key: string]: string;
}
interface HttpCookieExtras {
    path?: string;
    expires?: string;
}
export type GetCookieOptions = Omit<HttpCookie, 'key' | 'value'>;
export type SetCookieOptions = HttpCookie & HttpCookieExtras;
export type DeleteCookieOptions = Omit<HttpCookie, 'value'>;
export type ClearCookieOptions = Omit<HttpCookie, 'key' | 'value'>;
export declare class CapacitorCookiesPluginWeb extends WebPlugin implements CapacitorCookiesPlugin {
    getCookies(): Promise<HttpCookieMap>;
    setCookie(options: SetCookieOptions): Promise<void>;
    deleteCookie(options: DeleteCookieOptions): Promise<void>;
    clearCookies(): Promise<void>;
    clearAllCookies(): Promise<void>;
}
export declare const CapacitorCookies: CapacitorCookiesPlugin;
/******** END COOKIES PLUGIN ********/
/******** HTTP PLUGIN ********/
export interface CapacitorHttpPlugin {
    request(options: HttpOptions): Promise<HttpResponse>;
    get(options: HttpOptions): Promise<HttpResponse>;
    post(options: HttpOptions): Promise<HttpResponse>;
    put(options: HttpOptions): Promise<HttpResponse>;
    patch(options: HttpOptions): Promise<HttpResponse>;
    delete(options: HttpOptions): Promise<HttpResponse>;
}
export type HttpResponseType = 'arraybuffer' | 'blob' | 'json' | 'text' | 'document';
export interface HttpOptions {
    url: string;
    method?: string;
    params?: HttpParams;
    data?: any;
    headers?: HttpHeaders;
    /**
     * How long to wait to read additional data. Resets each time new
     * data is received
     */
    readTimeout?: number;
    /**
     * How long to wait for the initial connection.
     */
    connectTimeout?: number;
    /**
     * Sets whether automatic HTTP redirects should be disabled
     */
    disableRedirects?: boolean;
    /**
     * Extra arguments for fetch when running on the web
     */
    webFetchExtra?: RequestInit;
    /**
     * This is used to parse the response appropriately before returning it to
     * the requestee. If the response content-type is "json", this value is ignored.
     */
    responseType?: HttpResponseType;
    /**
     * Use this option if you need to keep the URL unencoded in certain cases
     * (already encoded, azure/firebase testing, etc.). The default is _true_.
     */
    shouldEncodeUrlParams?: boolean;
    /**
     * This is used if we've had to convert the data from a JS type that needs
     * special handling in the native layer
     */
    dataType?: 'file' | 'formData';
}
export interface HttpParams {
    [key: string]: string | string[];
}
export interface HttpHeaders {
    [key: string]: string;
}
export interface HttpResponse {
    data: any;
    status: number;
    headers: HttpHeaders;
    url: string;
}
/**
 * Read in a Blob value and return it as a base64 string
 * @param blob The blob value to convert to a base64 string
 */
export declare const readBlobAsBase64: (blob: Blob) => Promise<string>;
/**
 * Build the RequestInit object based on the options passed into the initial request
 * @param options The Http plugin options
 * @param extra Any extra RequestInit values
 */
export declare const buildRequestInit: (options: HttpOptions, extra?: RequestInit) => RequestInit;
export declare class CapacitorHttpPluginWeb extends WebPlugin implements CapacitorHttpPlugin {
    /**
     * Perform an Http request given a set of options
     * @param options Options to build the HTTP request
     */
    request(options: HttpOptions): Promise<HttpResponse>;
    /**
     * Perform an Http GET request given a set of options
     * @param options Options to build the HTTP request
     */
    get(options: HttpOptions): Promise<HttpResponse>;
    /**
     * Perform an Http POST request given a set of options
     * @param options Options to build the HTTP request
     */
    post(options: HttpOptions): Promise<HttpResponse>;
    /**
     * Perform an Http PUT request given a set of options
     * @param options Options to build the HTTP request
     */
    put(options: HttpOptions): Promise<HttpResponse>;
    /**
     * Perform an Http PATCH request given a set of options
     * @param options Options to build the HTTP request
     */
    patch(options: HttpOptions): Promise<HttpResponse>;
    /**
     * Perform an Http DELETE request given a set of options
     * @param options Options to build the HTTP request
     */
    delete(options: HttpOptions): Promise<HttpResponse>;
}
export declare const CapacitorHttp: CapacitorHttpPlugin;
export {};
/******** END HTTP PLUGIN ********/
