diff --git a/docs/mysql_schema.sql b/docs/mysql_schema.sql
new file mode 100644
index 0000000000000000000000000000000000000000..db83dabeac71d9a1b76670032d6d3af9540025ae
--- /dev/null
 b/docs/mysql_schema.sql
@@ -0,0 1,180 @@
-- MySQL schema adapted from PostgreSQL version

CREATE TABLE IF NOT EXISTS `C_CLIENTES` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `nome` VARCHAR(255) NOT NULL,
  `documento` VARCHAR(255) UNIQUE,
  `criado_em` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `C_CONTRATOS_CLIENTE` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `cliente_id` CHAR(36),
  `numero_contrato` VARCHAR(255) NOT NULL,
  `data_inicio` DATE NOT NULL,
  `data_fim` DATE NOT NULL,
  `valor_total` DECIMAL(14,2) NOT NULL,
  `valor_comprometido` DECIMAL(14,2) DEFAULT 0,
  `valor_disponivel` DECIMAL(14,2) GENERATED ALWAYS AS (`valor_total` - `valor_comprometido`) STORED,
  `status` ENUM('rascunho','ativo','encerrado'),
  UNIQUE KEY `uk_contrato_cliente_numero` (`cliente_id`, `numero_contrato`),
  CONSTRAINT `fk_contrato_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `C_CLIENTES` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `C_ESPECIFICACOES_SERVICO` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `contrato_id` CHAR(36),
  `numero_especificacao` VARCHAR(255) NOT NULL,
  `titulo` VARCHAR(255),
  `descricao` TEXT,
  `valor_total` DECIMAL(14,2) NOT NULL,
  `valor_comprometido` DECIMAL(14,2) DEFAULT 0,
  `valor_disponivel` DECIMAL(14,2) GENERATED ALWAYS AS (`valor_total` - `valor_comprometido`) STORED,
  UNIQUE KEY `uk_especificacao_numero` (`contrato_id`, `numero_especificacao`),
  CONSTRAINT `fk_especificacao_contrato` FOREIGN KEY (`contrato_id`) REFERENCES `C_CONTRATOS_CLIENTE` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `C_SOLICITACOES_SERVICO` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `especificacao_id` CHAR(36),
  `codigo_rs` VARCHAR(255) NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `escopo` TEXT,
  `complexidade` ENUM('baixa','media','alta'),
  `inicio_planejado` DATE,
  `fim_planejado` DATE,
  `inicio_real` DATE,
  `fim_real` DATE,
  `percentual_conclusao` DECIMAL(5,2) DEFAULT 0,
  `responsavel_cliente` VARCHAR(255),
  `responsavel_bu` VARCHAR(255),
  `justificativa` TEXT,
  `notas_aceite` TEXT,
  `status` ENUM('planejada','em_execucao','homologacao','encerrada') DEFAULT 'planejada',
  UNIQUE KEY `uk_solicitacao_codigo` (`especificacao_id`, `codigo_rs`),
  CONSTRAINT `fk_solicitacao_especificacao` FOREIGN KEY (`especificacao_id`) REFERENCES `C_ESPECIFICACOES_SERVICO` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `C_METRICAS_SOLICITACAO` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `solicitacao_id` CHAR(36),
  `tipo_metrica` ENUM('USH','USD','PF','PARCELA_FIXA'),
  `quantidade` DECIMAL(10,2) NOT NULL,
  `horas_unidade` DECIMAL(10,2),
  `taxa` DECIMAL(12,2),
  `valor_total` DECIMAL(14,2),
  UNIQUE KEY `uk_metrica_solicitacao` (`solicitacao_id`, `tipo_metrica`),
  CONSTRAINT `fk_metrica_solicitacao` FOREIGN KEY (`solicitacao_id`) REFERENCES `C_SOLICITACOES_SERVICO` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `C_FORNECEDORES` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `nome` VARCHAR(255) NOT NULL,
  `documento` VARCHAR(255) UNIQUE,
  `email_contato` VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `C_CONTRATOS_FORNECEDOR` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `fornecedor_id` CHAR(36),
  `numero_contrato` VARCHAR(255) NOT NULL,
  `data_inicio` DATE,
  `data_fim` DATE,
  `valor_total` DECIMAL(14,2),
  `valor_comprometido` DECIMAL(14,2) DEFAULT 0,
  `valor_disponivel` DECIMAL(14,2) GENERATED ALWAYS AS (`valor_total` - `valor_comprometido`) STORED,
  UNIQUE KEY `uk_contrato_fornecedor_numero` (`fornecedor_id`, `numero_contrato`),
  CONSTRAINT `fk_contrato_fornecedor` FOREIGN KEY (`fornecedor_id`) REFERENCES `C_FORNECEDORES` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `C_PERFIS_RECURSOS` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `nome` VARCHAR(255) NOT NULL,
  `descricao` TEXT,
  `valor_hora` DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS `C_RECURSOS_FORNECEDOR` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `fornecedor_id` CHAR(36),
  `perfil_id` CHAR(36),
  `nome_completo` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255),
  `ativo` TINYINT(1) DEFAULT 1,
  CONSTRAINT `fk_recurso_fornecedor` FOREIGN KEY (`fornecedor_id`) REFERENCES `C_FORNECEDORES` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recurso_perfil` FOREIGN KEY (`perfil_id`) REFERENCES `C_PERFIS_RECURSOS` (`id`)
);

CREATE TABLE IF NOT EXISTS `C_ORDENS_SERVICO` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `contrato_fornecedor_id` CHAR(36),
  `numero_os` VARCHAR(255) NOT NULL,
  `aberta_em` DATE DEFAULT (CURRENT_DATE),
  `perfil_solicitado_id` CHAR(36),
  `quantidade_solicitada` INT,
  `horas_solicitadas` DECIMAL(10,2),
  `valor_unitario` DECIMAL(12,2),
  `valor_reservado` DECIMAL(14,2),
  `valor_consumido` DECIMAL(14,2) DEFAULT 0,
  `valor_disponivel` DECIMAL(14,2) GENERATED ALWAYS AS (`valor_reservado` - `valor_consumido`) STORED,
  UNIQUE KEY `uk_ordem_servico_numero` (`contrato_fornecedor_id`, `numero_os`),
  CONSTRAINT `fk_os_contrato_fornecedor` FOREIGN KEY (`contrato_fornecedor_id`) REFERENCES `C_CONTRATOS_FORNECEDOR` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_os_perfil_solicitado` FOREIGN KEY (`perfil_solicitado_id`) REFERENCES `C_PERFIS_RECURSOS` (`id`)
);

CREATE TABLE IF NOT EXISTS `C_ALOCACOES_RECURSOS` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `solicitacao_id` CHAR(36),
  `recurso_fornecedor_id` CHAR(36),
  `ordem_servico_id` CHAR(36),
  `papel` VARCHAR(255),
  `inicio_alocacao` DATE,
  `fim_alocacao` DATE,
  CONSTRAINT `fk_alocacao_solicitacao` FOREIGN KEY (`solicitacao_id`) REFERENCES `C_SOLICITACOES_SERVICO` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alocacao_recurso` FOREIGN KEY (`recurso_fornecedor_id`) REFERENCES `C_RECURSOS_FORNECEDOR` (`id`),
  CONSTRAINT `fk_alocacao_ordem_servico` FOREIGN KEY (`ordem_servico_id`) REFERENCES `C_ORDENS_SERVICO` (`id`)
);

CREATE TABLE IF NOT EXISTS `C_APONTAMENTOS_TEMPO` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `alocacao_id` CHAR(36),
  `data_trabalho` DATE NOT NULL,
  `horas` DECIMAL(6,2) NOT NULL,
  `aprovado` TINYINT(1) DEFAULT 0,
  `mes_faturamento` DATE,
  CONSTRAINT `fk_apontamento_alocacao` FOREIGN KEY (`alocacao_id`) REFERENCES `C_ALOCACOES_RECURSOS` (`id`) ON DELETE CASCADE
);

DROP VIEW IF EXISTS `C_V_PROJETOS_FINANCEIROS`;
CREATE VIEW `C_V_PROJETOS_FINANCEIROS` AS
SELECT
  sr.`id` AS `solicitacao_id`,
  sr.`codigo_rs`,
  SUM(tm.`valor_total`) AS `orcamento_solicitacao`,
  SUM(te.`horas` * rp.`valor_hora`) AS `custo_fornecedor`,
  SUM(te.`horas`) AS `horas_totais`
FROM `C_SOLICITACOES_SERVICO` sr
LEFT JOIN `C_METRICAS_SOLICITACAO` tm ON tm.`solicitacao_id` = sr.`id`
LEFT JOIN `C_ALOCACOES_RECURSOS` ra ON ra.`solicitacao_id` = sr.`id`
LEFT JOIN `C_RECURSOS_FORNECEDOR` sres ON sres.`id` = ra.`recurso_fornecedor_id`
LEFT JOIN `C_PERFIS_RECURSOS` rp ON rp.`id` = sres.`perfil_id`
LEFT JOIN `C_APONTAMENTOS_TEMPO` te ON te.`alocacao_id` = ra.`id`
GROUP BY sr.`id`, sr.`codigo_rs`;

DROP TRIGGER IF EXISTS `trg_set_mes_faturamento_insert`;
DROP TRIGGER IF EXISTS `trg_set_mes_faturamento_update`;
DELIMITER //
CREATE TRIGGER `trg_set_mes_faturamento_insert`
BEFORE INSERT ON `C_APONTAMENTOS_TEMPO`
FOR EACH ROW
BEGIN
  SET NEW.`mes_faturamento` = DATE_FORMAT(NEW.`data_trabalho`, '%Y-%m-01');
END//

CREATE TRIGGER `trg_set_mes_faturamento_update`
BEFORE UPDATE ON `C_APONTAMENTOS_TEMPO`
FOR EACH ROW
BEGIN
  SET NEW.`mes_faturamento` = DATE_FORMAT(NEW.`data_trabalho`, '%Y-%m-01');
END//
DELIMITER ;
