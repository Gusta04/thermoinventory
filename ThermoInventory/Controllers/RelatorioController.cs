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
    public IActionResult GerarRelatorioPdf([FromBody] List<RelatorioPorEnderecoRequest> dadosDoInventario)
    {
        if (dadosDoInventario == null || dadosDoInventario.Count == 0)
        {
            return BadRequest("A lista de itens contados não pode estar vazia.");
        }

        var totaisAgrupados = new Dictionary<string, InventarioItem>();

        foreach (var grupoEndereco in dadosDoInventario)
        {
            foreach (var item in grupoEndereco.Itens)
            {
                var chave = $"{item.CodigoProduto}::{item.Descricao}";

                if (totaisAgrupados.TryGetValue(chave, out var agrupado))
                {
                    agrupado.Quantidade += item.Quantidade;
                }
                else
                {
                    totaisAgrupados.Add(chave, new InventarioItem
                    {
                        CodigoProduto = item.CodigoProduto,
                        Descricao = item.Descricao,
                        Quantidade = item.Quantidade,
                    });
                }
            }
        }

        var listaDeTotais = totaisAgrupados.Values.OrderBy(i => i.CodigoProduto).ToList();

        QuestPDF.Settings.License = LicenseType.Community;

        var documento = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Header().Element(ComposeHeader);

                page.Content()
                    .Column(col =>
                    {
                        col.Item().Element(container => ComposeReportByAddress(container, dadosDoInventario));

                        col.Item().PageBreak();
                        col.Item().Element(container => ComposeReportTotals(container, listaDeTotais));
                    });

                page.Footer().Element(ComposeFooter);
            });
        });
        byte[] pdfBytes = documento.GeneratePdf();
        string nomeArquivo = $"RelatorioConsolidado_{DateTime.Now:yyyy-MM-dd_HH-mm}.pdf";
        return File(pdfBytes, "application/pdf", nomeArquivo);      
    }

    private static void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Text("Relatório de Contagem de Inventário")
                .SemiBold().FontSize(20).FontColor(Colors.Blue.Medium);
            col.Item().Text($"Data de Emissão: {DateTime.Now:dd/MM/yyyy HH:mm:ss}").Light();
            col.Spacing(10);
            col.Item().LineHorizontal(1);
        });
    }

    private static void ComposeFooter(IContainer container)
    {
        container.AlignCenter().Text(x =>
        {
            x.Span("Página ");
            x.CurrentPageNumber();
            x.Span(" de ");
            x.TotalPages();
        });
    }

    void ComposeReportByAddress(IContainer container, List<RelatorioPorEnderecoRequest> data)
    {
        container.Column(col =>
        {
            col.Item().PaddingBottom(10).Text("Relatório Detalhado por Endereço").SemiBold().FontSize(16);

            foreach (var grupoEndereco in data)
            {
                col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(3);
                        columns.RelativeColumn(7);
                        columns.RelativeColumn(1);
                    });
                    
                    table.Header(header =>
                    {
                        header.Cell().ColumnSpan(3).Background(Colors.Grey.Lighten3).Padding(5)
                            .Text($"Endereço: {grupoEndereco.Endereco}").SemiBold();
                    });

                    foreach (var item in grupoEndereco.Itens.OrderBy(i => i.CodigoProduto))
                    {
                        table.Cell().Padding(5).Text(item.CodigoProduto);
                        table.Cell().Padding(5).Text(item.Descricao);
                        table.Cell().Padding(5).AlignRight().Text(item.Quantidade.ToString());
                    }
                });
                col.Spacing(20);
            }
        });
    }

    void ComposeReportTotals(IContainer container, List<InventarioItem> totals)
    {
        container.Column(col =>
        {
            col.Item().PaddingBottom(10).Text("Relatório Geral Totalizado").SemiBold().FontSize(16);
            
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(3);
                    columns.RelativeColumn(7);
                    columns.RelativeColumn(1);
                });
                
                table.Header(header =>
                {
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Código do Produto");
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Descrição");
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(5).AlignRight().Text("Quantidade");
                });

                foreach (var item in totals)
                {
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(item.CodigoProduto);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(item.Descricao);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).AlignRight().Text(item.Quantidade.ToString());
                }
            });
        });
    }
}