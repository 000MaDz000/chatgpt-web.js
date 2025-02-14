import { LaunchOptions } from "puppeteer";

export interface ChatGPTOptions {
    puppeteer?: LaunchOptions;
}

export interface ChatGPTChatChatOptions {
    chatRoles: string;
    chatId?: string;
}


/**
 * The Request Responses
 */

export interface IChatGPTChat {
    id: string;
    async_status: null | boolean;
    conversation_origin: null | string;
    conversation_template_id: null | string;
    create_time: string;
    current_node: unknown
    gizmo_id: null | string;
    is_archived: boolean;
    is_starred: boolean
    is_unread: boolean
    mapping: unknown
    safe_urls: unknown[]
    snippet: null | unknown
    title: string;
    update_time: string;
    workspace_id: null
}

export interface ChatGPTPaginationResponse<T> {
    items: T[] | null;
    offset: number;
    limit: number;
    total: number;
    has_missing_conversations: boolean;
}