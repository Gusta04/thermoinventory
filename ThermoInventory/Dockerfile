# ----- Base Image -----
# Use a imagem de runtime ASP.NET (ela contém o runtime + o servidor Kestrel)
# !!! MUDE "8.0" para a versão do seu .NET (ex: 6.0, 7.0)
FROM mcr.microsoft.com/dotnet/aspnet:9.0

# Define a porta que o Kestrel (servidor .NET) vai ouvir
# 8080 é um padrão comum para containers.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos da sua pasta "publish" para a pasta /app
COPY ./publish .

# ----- Comando de Execução -----
# Define o comando que será executado quando o container iniciar
# !!! MUDE "SeuPrograma.dll" para o nome do arquivo .dll principal
ENTRYPOINT ["dotnet", "ThermoInventory.dll"]