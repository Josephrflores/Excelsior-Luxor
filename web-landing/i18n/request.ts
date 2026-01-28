import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    if (!locale || !routing.locales.includes(locale as any)) {
        locale = routing.defaultLocale;
    }

    // Explicitly import messages to avoid build-time dynamic import errors
    const messages = {
        en: (await import('../messages/en.json')).default,
        es: (await import('../messages/es.json')).default
    };

    return {
        locale,
        messages: messages[locale as keyof typeof messages]
    };
});
