import re

def validate_email(email: str) -> bool:
    """Validate email format using regex.

    Args:
        email: Email address to validate

    Returns:
        True if email is valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength.

    Password must:
    - Be at least 6 characters long

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, message)
    """
    if len(password) < 6:
        return (False, "비밀번호는 최소 6자 이상이어야 합니다")

    return (True, "Password is valid")
