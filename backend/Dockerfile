# BiAniBirak.Api - cok asamali build (sdk -> aspnet runtime; debian: ICU dahil, Turkce-guvenli)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/BiAniBirak.Api/BiAniBirak.Api.csproj ./BiAniBirak.Api/
RUN dotnet restore ./BiAniBirak.Api/BiAniBirak.Api.csproj
COPY src/BiAniBirak.Api/ ./BiAniBirak.Api/
RUN dotnet publish ./BiAniBirak.Api/BiAniBirak.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN adduser --disabled-password --gecos "" --uid 1001 apiuser
COPY --from=build /app/publish ./
USER apiuser
EXPOSE 8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENTRYPOINT ["dotnet", "BiAniBirak.Api.dll"]
