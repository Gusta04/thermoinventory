using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ThermoInventory.Models;

namespace ThermoInventory.Controllers;

[ApiController] // Marca esta classe como um Controller de API
[Route("api/[controller]")] // Define a rota base como "api/relatorio"
public class RelatorioController : ControllerBase
{
    [HttpPost("gerar")]
    public IActionResult GerarRelatorioPdf([FromBody] List<InventarioItem> itensContados)
    {
        if (itensContados == null || itensContados.Count == 0)
        {
            // Se não enviou, retorna um erro "Bad Request" (Requisição Inválida)
            return BadRequest("A lista de itens contados não pode estar vazia.");
        }
        
        QuestPDF.Settings.License = LicenseType.Community;
        
        var documento = Document.Create(container =>
            {
                container.Page(page =>
                {
                    // Configurações da página
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.DefaultTextStyle(x => x.FontSize(12));

                    // Cabeçalho do Relatório
                    page.Header()
                        .Column(col =>
                        {
                            col.Item().Text("Relatório de Contagem de Inventário")
                                .SemiBold().FontSize(20).FontColor(Colors.Blue.Medium);
                            
                            col.Item().Text($"Data de Emissão: {DateTime.Now:dd/MM/yyyy HH:mm:ss}")
                                .Light();

                            col.Item().LineHorizontal(1);
                            col.Spacing(10);
                        });

                    // Conteúdo Principal (A Tabela)
                    page.Content()
                        .PaddingVertical(1, Unit.Centimetre)
                        .Table(table =>
                        {
                            // Define as colunas da tabela
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3); // Coluna para o Código do Produto
                                columns.RelativeColumn(1); // Coluna para a Quantidade
                            });

                            // Cabeçalho da tabela
                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Código do Produto");
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("Quantidade");
                            });

                            // Corpo da tabela: um loop pelos itens recebidos
                            foreach (var item in itensContados)
                            {
                                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).
                                    Text(item.CodigoProduto);
                                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).
                                    AlignRight().Text(item.Quantidade.ToString());
                            }
                        });
                    
                    // Rodapé com o número da página
                    page.Footer()
                        .AlignCenter()
                        .Text(x =>
                        {
                            x.Span("Página ");
                            x.CurrentPageNumber();
                        });
                });
            });

            // Gera o PDF em memória como um array de bytes
            byte[] pdfBytes = documento.GeneratePdf();
            
            // --- 3. Envio do Arquivo para o Usuário ---
            
            // Cria um nome de arquivo dinâmico com a data atual
            string nomeArquivo = $"RelatorioInventario_{DateTime.Now:yyyy-MM-dd_HH-mm}.pdf";

            // Retorna o arquivo para o navegador. O navegador irá iniciar o download.
            return File(pdfBytes, "application/pdf", nomeArquivo);
    }
}