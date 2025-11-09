import argparse
import base64
from pathlib import Path
import struct
import zlib

WIDTH, HEIGHT = 2200, 1500
BACKGROUND = 255
ROWS = []

FONT = {
    ' ': [
        "00000",
        "00000",
        "00000",
        "00000",
        "00000",
        "00000",
        "00000",
    ],
    'A': [
        "01110",
        "10001",
        "10001",
        "11111",
        "10001",
        "10001",
        "10001",
    ],
    'B': [
        "11110",
        "10001",
        "10001",
        "11110",
        "10001",
        "10001",
        "11110",
    ],
    'C': [
        "01110",
        "10001",
        "10000",
        "10000",
        "10000",
        "10001",
        "01110",
    ],
    'D': [
        "11100",
        "10010",
        "10001",
        "10001",
        "10001",
        "10010",
        "11100",
    ],
    'E': [
        "11111",
        "10000",
        "10000",
        "11110",
        "10000",
        "10000",
        "11111",
    ],
    'F': [
        "11111",
        "10000",
        "10000",
        "11110",
        "10000",
        "10000",
        "10000",
    ],
    'G': [
        "01110",
        "10001",
        "10000",
        "10111",
        "10001",
        "10001",
        "01110",
    ],
    'H': [
        "10001",
        "10001",
        "10001",
        "11111",
        "10001",
        "10001",
        "10001",
    ],
    'I': [
        "11111",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
        "11111",
    ],
    'J': [
        "00001",
        "00001",
        "00001",
        "00001",
        "10001",
        "10001",
        "01110",
    ],
    'K': [
        "10001",
        "10010",
        "10100",
        "11000",
        "10100",
        "10010",
        "10001",
    ],
    'L': [
        "10000",
        "10000",
        "10000",
        "10000",
        "10000",
        "10000",
        "11111",
    ],
    'M': [
        "10001",
        "11011",
        "10101",
        "10101",
        "10001",
        "10001",
        "10001",
    ],
    'N': [
        "10001",
        "11001",
        "10101",
        "10011",
        "10001",
        "10001",
        "10001",
    ],
    'O': [
        "01110",
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "01110",
    ],
    'P': [
        "11110",
        "10001",
        "10001",
        "11110",
        "10000",
        "10000",
        "10000",
    ],
    'Q': [
        "01110",
        "10001",
        "10001",
        "10001",
        "10101",
        "10010",
        "01101",
    ],
    'R': [
        "11110",
        "10001",
        "10001",
        "11110",
        "10100",
        "10010",
        "10001",
    ],
    'S': [
        "01111",
        "10000",
        "10000",
        "01110",
        "00001",
        "00001",
        "11110",
    ],
    'T': [
        "11111",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
    ],
    'U': [
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "01110",
    ],
    'V': [
        "10001",
        "10001",
        "10001",
        "10001",
        "01010",
        "01010",
        "00100",
    ],
    'W': [
        "10001",
        "10001",
        "10001",
        "10101",
        "10101",
        "10101",
        "01010",
    ],
    'X': [
        "10001",
        "01010",
        "00100",
        "00100",
        "00100",
        "01010",
        "10001",
    ],
    'Y': [
        "10001",
        "01010",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
    ],
    'Z': [
        "11111",
        "00001",
        "00010",
        "00100",
        "01000",
        "10000",
        "11111",
    ],
    '0': [
        "01110",
        "10001",
        "10011",
        "10101",
        "11001",
        "10001",
        "01110",
    ],
    '1': [
        "00100",
        "01100",
        "00100",
        "00100",
        "00100",
        "00100",
        "01110",
    ],
    '2': [
        "01110",
        "10001",
        "00001",
        "00010",
        "00100",
        "01000",
        "11111",
    ],
    '3': [
        "11110",
        "00001",
        "00001",
        "01110",
        "00001",
        "00001",
        "11110",
    ],
    '4': [
        "00010",
        "00110",
        "01010",
        "10010",
        "11111",
        "00010",
        "00010",
    ],
    '5': [
        "11111",
        "10000",
        "10000",
        "11110",
        "00001",
        "00001",
        "11110",
    ],
    '6': [
        "01110",
        "10000",
        "10000",
        "11110",
        "10001",
        "10001",
        "01110",
    ],
    '7': [
        "11111",
        "00001",
        "00010",
        "00100",
        "01000",
        "01000",
        "01000",
    ],
    '8': [
        "01110",
        "10001",
        "10001",
        "01110",
        "10001",
        "10001",
        "01110",
    ],
    '9': [
        "01110",
        "10001",
        "10001",
        "01111",
        "00001",
        "00001",
        "01110",
    ],
    '_': [
        "00000",
        "00000",
        "00000",
        "00000",
        "00000",
        "00000",
        "11111",
    ],
    '-': [
        "00000",
        "00000",
        "00000",
        "11111",
        "00000",
        "00000",
        "00000",
    ],
    '(': [
        "00010",
        "00100",
        "01000",
        "01000",
        "01000",
        "00100",
        "00010",
    ],
    ')': [
        "01000",
        "00100",
        "00010",
        "00010",
        "00010",
        "00100",
        "01000",
    ],
    ':': [
        "00000",
        "00100",
        "00100",
        "00000",
        "00100",
        "00100",
        "00000",
    ],
}

FONT_HEIGHT = 7
FONT_WIDTH = 5
SCALE = 2


def reset_canvas():
    global ROWS
    ROWS = [bytearray([BACKGROUND] * WIDTH * 3) for _ in range(HEIGHT)]


def set_pixel(x, y, color):
    if 0 <= x < WIDTH and 0 <= y < HEIGHT:
        row = ROWS[y]
        idx = x * 3
        row[idx] = color[0]
        row[idx + 1] = color[1]
        row[idx + 2] = color[2]


def fill_rect(x0, y0, x1, y1, color):
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0
    x0 = max(0, x0)
    y0 = max(0, y0)
    x1 = min(WIDTH - 1, x1)
    y1 = min(HEIGHT - 1, y1)
    for y in range(y0, y1 + 1):
        row = ROWS[y]
        for x in range(x0, x1 + 1):
            idx = x * 3
            row[idx] = color[0]
            row[idx + 1] = color[1]
            row[idx + 2] = color[2]


def draw_rect(x0, y0, x1, y1, color, border=1):
    fill_rect(x0, y0, x1, y0 + border - 1, color)
    fill_rect(x0, y1 - border + 1, x1, y1, color)
    fill_rect(x0, y0, x0 + border - 1, y1, color)
    fill_rect(x1 - border + 1, y0, x1, y1, color)


def draw_line(x0, y0, x1, y1, color):
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        set_pixel(x0, y0, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def draw_text(x, y, text, color=(0, 0, 0)):
    cursor_x = x
    cursor_y = y
    for ch in text:
        if ch == '\n':
            cursor_y += (FONT_HEIGHT + 2) * SCALE
            cursor_x = x
            continue
        glyph = FONT.get(ch.upper(), FONT[' '])
        for gy, row_bits in enumerate(glyph):
            for gx, bit in enumerate(row_bits):
                if bit == '1':
                    for sy in range(SCALE):
                        for sx in range(SCALE):
                            set_pixel(cursor_x + gx * SCALE + sx, cursor_y + gy * SCALE + sy, color)
        cursor_x += (FONT_WIDTH + 1) * SCALE


def draw_table(x, y, width, title, fields):
    header_height = (FONT_HEIGHT * SCALE) + 16
    row_height = (FONT_HEIGHT * SCALE) + 10
    height = header_height + row_height * len(fields) + 10
    fill_rect(x, y, x + width, y + height, (245, 248, 252))
    fill_rect(x, y, x + width, y + header_height, (217, 231, 245))
    draw_rect(x, y, x + width, y + height, (60, 91, 124), border=3)
    draw_rect(x, y + header_height, x + width, y + header_height, (60, 91, 124), border=2)
    draw_text(x + 12, y + 8, title, (0, 43, 89))
    for idx, field in enumerate(fields):
        draw_text(x + 12, y + header_height + 8 + idx * row_height, field.upper(), (20, 20, 20))
    return (x, y, x + width, y + height)


def build_png_bytes():
    raw_data = b''.join(b'\x00' + bytes(row) for row in ROWS)
    compressed = zlib.compress(raw_data, 9)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', WIDTH, HEIGHT, 8, 2, 0, 0, 0)
    png_parts = [
        b'\x89PNG\r\n\x1a\n',
        chunk(b'IHDR', ihdr),
        chunk(b'IDAT', compressed),
        chunk(b'IEND', b''),
    ]
    return b''.join(png_parts)


TABLES = {
    'C_CLIENTES': {
        'pos': (80, 60),
        'fields': [
            'id (pk)',
            'nome',
            'documento (uk)',
            'criado_em'
        ]
    },
    'C_CONTRATOS_CLIENTE': {
        'pos': (80, 330),
        'fields': [
            'id (pk)',
            'cliente_id (fk)',
            'numero_contrato',
            'data_inicio',
            'data_fim',
            'valor_total',
            'valor_comprometido',
            'valor_disponivel',
            'status'
        ]
    },
    'C_ESPECIFICACOES_SERVICO': {
        'pos': (80, 750),
        'fields': [
            'id (pk)',
            'contrato_id (fk)',
            'numero_especificacao',
            'titulo',
            'descricao',
            'valor_total',
            'valor_comprometido',
            'valor_disponivel'
        ]
    },
    'C_SOLICITACOES_SERVICO': {
        'pos': (520, 200),
        'fields': [
            'id (pk)',
            'especificacao_id (fk)',
            'codigo_rs',
            'titulo',
            'escopo',
            'complexidade',
            'inicio_planejado',
            'fim_planejado',
            'inicio_real',
            'fim_real',
            'percentual_conclusao',
            'responsavel_cliente',
            'responsavel_bu',
            'justificativa',
            'notas_aceite',
            'status'
        ]
    },
    'C_METRICAS_SOLICITACAO': {
        'pos': (520, 760),
        'fields': [
            'id (pk)',
            'solicitacao_id (fk)',
            'tipo_metrica',
            'quantidade',
            'horas_unidade',
            'taxa',
            'valor_total'
        ]
    },
    'C_ALOCACOES_RECURSOS': {
        'pos': (960, 760),
        'fields': [
            'id (pk)',
            'solicitacao_id (fk)',
            'recurso_fornecedor_id (fk)',
            'ordem_servico_id (fk)',
            'papel',
            'inicio_alocacao',
            'fim_alocacao'
        ]
    },
    'C_APONTAMENTOS_TEMPO': {
        'pos': (960, 1080),
        'fields': [
            'id (pk)',
            'alocacao_id (fk)',
            'data_trabalho',
            'horas',
            'aprovado',
            'mes_faturamento'
        ]
    },
    'C_FORNECEDORES': {
        'pos': (1400, 60),
        'fields': [
            'id (pk)',
            'nome',
            'documento (uk)',
            'email_contato'
        ]
    },
    'C_CONTRATOS_FORNECEDOR': {
        'pos': (1400, 330),
        'fields': [
            'id (pk)',
            'fornecedor_id (fk)',
            'numero_contrato',
            'data_inicio',
            'data_fim',
            'valor_total',
            'valor_comprometido',
            'valor_disponivel'
        ]
    },
    'C_ORDENS_SERVICO': {
        'pos': (1400, 760),
        'fields': [
            'id (pk)',
            'contrato_fornecedor_id (fk)',
            'numero_os',
            'aberta_em',
            'perfil_solicitado_id (fk)',
            'quantidade_solicitada',
            'horas_solicitadas',
            'valor_unitario',
            'valor_reservado',
            'valor_consumido',
            'valor_disponivel'
        ]
    },
    'C_PERFIS_RECURSOS': {
        'pos': (1840, 60),
        'fields': [
            'id (pk)',
            'nome',
            'descricao',
            'valor_hora'
        ]
    },
    'C_RECURSOS_FORNECEDOR': {
        'pos': (1840, 330),
        'fields': [
            'id (pk)',
            'fornecedor_id (fk)',
            'perfil_id (fk)',
            'nome_completo',
            'email',
            'ativo'
        ]
    }
}

RELATIONS = [
    ('C_CLIENTES', 'C_CONTRATOS_CLIENTE', 'ASSINA'),
    ('C_CONTRATOS_CLIENTE', 'C_ESPECIFICACOES_SERVICO', 'INCLUI'),
    ('C_ESPECIFICACOES_SERVICO', 'C_SOLICITACOES_SERVICO', 'DETALHA'),
    ('C_SOLICITACOES_SERVICO', 'C_METRICAS_SOLICITACAO', 'MEDE'),
    ('C_SOLICITACOES_SERVICO', 'C_ALOCACOES_RECURSOS', 'USA'),
    ('C_ALOCACOES_RECURSOS', 'C_APONTAMENTOS_TEMPO', 'REGISTRA'),
    ('C_FORNECEDORES', 'C_CONTRATOS_FORNECEDOR', 'FIRMA'),
    ('C_FORNECEDORES', 'C_RECURSOS_FORNECEDOR', 'ALOCA'),
    ('C_PERFIS_RECURSOS', 'C_RECURSOS_FORNECEDOR', 'CLASSIFICA'),
    ('C_CONTRATOS_FORNECEDOR', 'C_ORDENS_SERVICO', 'ORIGINA'),
    ('C_PERFIS_RECURSOS', 'C_ORDENS_SERVICO', 'SOLICITA'),
    ('C_ORDENS_SERVICO', 'C_ALOCACOES_RECURSOS', 'ATENDE'),
    ('C_RECURSOS_FORNECEDOR', 'C_ALOCACOES_RECURSOS', 'PARTICIPA')
]


def render_diagram():
    reset_canvas()
    boxes = {}
    for name, data in TABLES.items():
        x, y = data['pos']
        boxes[name] = draw_table(x, y, 360, name, data['fields'])

    for origin, target, label in RELATIONS:
        ox0, oy0, ox1, oy1 = boxes[origin]
        tx0, ty0, tx1, ty1 = boxes[target]
        sx = (ox0 + ox1) // 2
        sy = (oy0 + oy1) // 2
        ex = (tx0 + tx1) // 2
        ey = (ty0 + ty1) // 2
        draw_line(sx, sy, ex, ey, (60, 91, 124))
        label_x = (sx + ex) // 2 - (len(label) * (FONT_WIDTH + 1) * SCALE) // 2
        label_y = (sy + ey) // 2 - 12
        draw_text(label_x, label_y, label, (60, 91, 124))

    return build_png_bytes()


def ensure_parent(path: Path):
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)


def write_png(path: Path, png_bytes: bytes):
    ensure_parent(path)
    path.write_bytes(png_bytes)


def make_data_uri(png_bytes: bytes) -> str:
    payload = base64.b64encode(png_bytes).decode('ascii')
    return f"data:image/png;base64,{payload}"


def write_data_uri(path: Path, png_bytes: bytes):
    ensure_parent(path)
    path.write_text(make_data_uri(png_bytes), encoding='utf-8')


def parse_args():
    parser = argparse.ArgumentParser(
        description="Render the Projetos_RS ER diagram as PNG or data URI without external dependencies."
    )
    parser.add_argument(
        "--png",
        type=Path,
        help="Destination path for the PNG file (binary output).",
    )
    parser.add_argument(
        "--data-uri",
        type=Path,
        help="Destination path for a text file containing the data URI image string.",
    )
    parser.add_argument(
        "--stdout-data-uri",
        action="store_true",
        help="Write the data URI to stdout so it can be copied or piped elsewhere.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    png_bytes = render_diagram()

    if not any([args.png, args.data_uri, args.stdout_data_uri]):
        args.png = Path("docs/projetos_rs_er_diagram.png")
        args.data_uri = Path("docs/projetos_rs_er_diagram.data-uri")

    if args.png:
        write_png(args.png, png_bytes)

    if args.data_uri:
        write_data_uri(args.data_uri, png_bytes)

    if args.stdout_data_uri:
        print(make_data_uri(png_bytes))


if __name__ == "__main__":
    main()
