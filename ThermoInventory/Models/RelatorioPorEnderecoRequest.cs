namespace ThermoInventory.Models;

public class RelatorioPorEnderecoRequest
{
    public string Endereco { get; set; }
    
    public List<InventarioItem> Itens  { get; set; }
}