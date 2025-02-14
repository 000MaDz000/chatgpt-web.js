import { LaunchOptions } from "puppeteer";

export interface ChatGPTOptions {
    puppeteer?: LaunchOptions;
    assistantName?: string
    keyboardWriteDelay?: number;
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


/**
 * this commented types comes from back end api of chatgpt.com for send message event
 * but actually it's not recommended to use the api directly because it's complexty and because i don't understand this api yet
 */
// interface ClientContextualInfo {
//     is_dark_mode: boolean;
//     page_height: number;
//     page_width: number;
//     pixel_ratio: number;
//     screen_height: number;
//     screen_width: number;
//     time_since_loaded: number;
// }

// interface ConversationMode {
//     kind: "primary_assistant" | unknown;
// }

// interface Author {
//     role: "assistant" | "user";
// }

// interface Content {
//     content_type: "text";
//     parts: string[];
// }

// interface SerializationMetadata {
//     custom_symbol_offsets: unknown[];
// }

// interface Metadata {
//     serialization_metadata: SerializationMetadata;
//     dictation: boolean;
// }

// interface Message {
//     author: Author;
//     content: Content;
//     create_time: number;
//     id: string;
//     metadata: Metadata;
// }

// interface MainData {
//     action: string;
//     client_contextual_info: ClientContextualInfo;
//     conversation_mode: ConversationMode;
//     enable_message_followups: boolean;
//     history_and_training_disabled: boolean;
//     messages: Message[];
//     model: string;
//     paragen_cot_summary_display_override: string;
//     parent_message_id: string;
//     suggestions: any[]; // يمكن استبدال any بنوع محدد إذا كان معروفًا
//     supported_encodings: string[];
//     supports_buffering: boolean;
//     system_hints: any[]; // يمكن استبدال any بنوع محدد إذا كان معروفًا
//     timezone: string;
//     timezone_offset_min: number;
// }