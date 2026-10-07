export const SOCIAL_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const FAVICON_TYPES = ['image/png', 'image/svg+xml', 'image/x-icon'];

export type SettingKey = 'title' | 'description' | 'language' | 'baseUrl' | 'titleTemplate';

const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const WEB_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

export function settingError(key: SettingKey, value: string): string | null {
  const trimmed = value.trim();
  if (key === 'title' && trimmed === '') {
    return 'Enter a site title';
  } else if (key === 'language' && !LANGUAGE_CODE.test(trimmed)) {
    return 'Pick a language';
  } else if (key === 'baseUrl' && trimmed !== '' && !WEB_URL.test(trimmed)) {
    return 'Enter a full address that starts with https://';
  } else {
    return null;
  }
}
