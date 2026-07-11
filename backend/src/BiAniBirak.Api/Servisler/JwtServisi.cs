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

    // aktifEtkinlikId opsiyonel: kayit/giris'te null (bos claim); aktif-yap ucunda dolu.
    // goruntulemeModu: super admin baska bir deftere SALT-OKUNUR girdiginde true.
    //   -> global write-guard middleware bu claim'i gorur ve tum tenant yazimlarini 403 yapar.
    //   -> otorite JWT claim'idir; frontend header'ina ASLA guvenilmez.
    // sureSaat: doluysa gun yerine saat cinsinden omur (impersonation = 1 saat).
    public string Uret(
        Kullanici kullanici,
        Guid? aktifEtkinlikId = null,
        bool goruntulemeModu = false,
        int? sureSaat = null)
    {
        var anahtar = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_gizli));
        var imza = new SigningCredentials(anahtar, SecurityAlgorithms.HmacSha256);

        var talepler = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, kullanici.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, kullanici.Email),
            new("super_admin", kullanici.SuperAdmin ? "true" : "false"),
            new("aktif_etkinlik_id", aktifEtkinlikId?.ToString() ?? string.Empty),
            new("goruntuleme_modu", goruntulemeModu ? "true" : "false"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var bitis = sureSaat.HasValue
            ? DateTime.UtcNow.AddHours(sureSaat.Value)
            : DateTime.UtcNow.AddDays(_gecerlilikGun);

        var token = new JwtSecurityToken(
            issuer: _yayinci,
            audience: _hedef,
            claims: talepler,
            expires: bitis,
            signingCredentials: imza);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
