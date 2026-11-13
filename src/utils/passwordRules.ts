/** Kết quả kiểm tra từng quy tắc mật khẩu (đồng bộ 100% với haloticket-web). */
export interface PasswordRules {
  hasValidLength: boolean;
  hasLowercaseAndNumber: boolean;
  hasSpecialCharacter: boolean;
  hasUppercase: boolean;
}

const specialCharacterPattern = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

/**
 * Kiểm tra mật khẩu theo từng quy tắc: dài 8 đến 32 ký tự, có chữ thường và số,
 * có ký tự đặc biệt, và có ít nhất 1 chữ in hoa.
 */
export function getPasswordRules(password: string): PasswordRules {
  return {
    hasValidLength: password.length >= 8 && password.length <= 32,
    hasLowercaseAndNumber: /[a-z]/.test(password) && /\d/.test(password),
    hasSpecialCharacter: specialCharacterPattern.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };
}

/** Mật khẩu hợp lệ khi thỏa toàn bộ 4 quy tắc. */
export function isPasswordValid(password: string): boolean {
  return Object.values(getPasswordRules(password)).every(Boolean);
}

