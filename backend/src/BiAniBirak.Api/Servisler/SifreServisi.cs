namespace BiAniBirak.Api.Servisler;

// Parola hash/dogrulama - bcrypt (Belge 08).
public class SifreServisi
{
    public string Hashle(string sifre) => BCrypt.Net.BCrypt.HashPassword(sifre);

    public bool Dogrula(string sifre, string hash) => BCrypt.Net.BCrypt.Verify(sifre, hash);
}
