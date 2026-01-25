# packer.py
import os

# Configurações
output_file = "full_project_code.txt"

# Pastas para ignorar
ignore_dirs = {
    '.git', 'node_modules', 'dist', 'build', '__pycache__', 
    '.next', 'coverage', 'venv', '.venv', 'env', '.idea', '.vscode'
}

# Arquivos Específicos para ignorar (AQUI ESTÁ A CORREÇÃO PRINCIPAL)
ignore_specific_files = {
    'packer.py',
    output_file,             # Ignora o arquivo que está sendo gerado agora
    '_PROJETO_COMPLETO.txt', # <--- O CULPADO: Ignora o output do pack.js
    'pack.js',               # Ignora o script Node
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'project_structure.json',
    'mapper.js',
    'packer.py',
    'comments.js'
}

# Extensões para ignorar
ignore_exts = {
    '.png', '.jpg', '.jpeg', '.svg', '.ico', '.log', '.lock', 
    '.exe', '.dll', '.so', '.pyc', 
    # '.json' # CUIDADO: Ignorar .json remove package.json e tsconfig.json. Removi daqui.
} 

def pack_project():
    if os.path.exists(output_file):
        os.remove(output_file)

    with open(output_file, 'w', encoding='utf-8') as outfile:
        count = 0
        for root, dirs, files in os.walk("."):
            # Pula pastas ignoradas
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                file_ext = os.path.splitext(file)[1]
                
                # 1. Verifica se o arquivo está na lista de nomes proibidos
                if file in ignore_specific_files:
                    continue
                
                # 2. Verifica extensão
                if file_ext in ignore_exts:
                    continue

                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        outfile.write("=" * 80 + "\n")
                        outfile.write(f"File: {file_path}\n")
                        outfile.write("=" * 80 + "\n")
                        outfile.write(content + "\n\n")
                        
                        print(f"Adicionado: {file_path}")
                        count += 1
                except Exception as e:
                    pass

    print(f"\n--- Sucesso! {count} arquivos salvos em {output_file} ---")

if __name__ == "__main__":
    pack_project()