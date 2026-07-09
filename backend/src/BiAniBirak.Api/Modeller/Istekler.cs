namespace BiAniBirak.Api.Modeller;

// Istek govdeleri (JSON). Minimal ve sade.
public record KayitIstek(string Ad, string Email, string Sifre);
public record GirisIstek(string Email, string Sifre);
