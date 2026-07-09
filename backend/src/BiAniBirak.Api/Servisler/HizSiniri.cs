using System.Collections.Concurrent;

namespace BiAniBirak.Api.Servisler;

// Basit in-memory hiz siniri (Belge 08: guest gonderiminde spam korumasi).
// Anahtar basina (ornek: IP+token) belirli pencerede sinirli istek.
// Not: tek-surec in-memory; olcekleme gerekirse dagitik store (Redis) eklenir.
public class HizSiniri
{
    private readonly ConcurrentDictionary<string, List<DateTimeOffset>> _kayitlar = new();

    // anahtar icin son 'pencere' suresinde en fazla 'limit' istek serbest.
    public bool IzinVar(string anahtar, int limit, TimeSpan pencere)
    {
        var simdi = DateTimeOffset.UtcNow;
        var esik = simdi - pencere;

        var liste = _kayitlar.GetOrAdd(anahtar, _ => new List<DateTimeOffset>());
        lock (liste)
        {
            // pencere disi eski kayitlari at
            liste.RemoveAll(t => t < esik);
            if (liste.Count >= limit)
                return false;
            liste.Add(simdi);
            return true;
        }
    }
}
