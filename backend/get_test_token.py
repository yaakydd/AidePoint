from supabase import create_client

SUPABASE_URL="https://pbqsbpmyhrolwifgyjtz.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBicXNicG15aHJvbHdpZmd5anR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODY0MjEsImV4cCI6MjA5NTQ2MjQyMX0.E9YJBjOCiEafDBZGTk0UHrCGovSi0nYwNFP_gYLHQLg"
TEST_EMAIL = "antwiyaa17@gmail.com"
TEST_PASSWORD = "Kydd.171.Gimd_"

client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
result = client.auth.sign_in_with_password(
    {"email": TEST_EMAIL, "password": TEST_PASSWORD}
)

if result.session is None:
    raise RuntimeError(
        "Login failed, check SUPABASE_URL, SUPABASE_ANON_KEY, "
        "TEST_EMAIL, and TEST_PASSWORD are all correct."
    )

print(result.session.access_token)