using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BiAniBirak.Api.Entities;
using Microsoft.IdentityModel.Tokens;

namespace BiAniBirak.Api.Servisler;

// JWT uretimi. Kritik baglam claim'lerde: sub, super_admin, aktif_etkinlik_id (Belge/instruction).
public class JwtServisi
{
    private readonly string _gizli;
    private readonly string _yayinci;
    private readonly string _hedef;
    private readonly int _gecerlilikGun;

    public JwtServisi(string gizli, string yayinci, string hedef, int gecerlilikGun)
    {
        _gizli = gizli;
        _yayinci = yayinci;
        _hedef = hedef;
        _gecerlilikGun = gecerlilikGun;
    }

    public int GecerlilikGun => _gecerlilikGun;

    public string Uret(Kullanici kullanici)
    {
        var anahtar = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_gizli));
        var imza = new SigningCredentials(anahtar, SecurityAlgorithms.HmacSha256);

        var talepler = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, kullanici.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, kullanici.Email),
            new("super_admin", kullanici.SuperAdmin ? "true" : "false"),
            new("aktif_etkinlik_id", string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _yayinci,
            audience: _hedef,
            claims: talepler,
            expires: DateTime.UtcNow.AddDays(_gecerlilikGun),
            signingCredentials: imza);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
