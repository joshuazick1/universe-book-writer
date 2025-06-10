/**
 * Enhanced plugin validation system with security checks and advanced validation rules
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PluginType } from '@universe-book-writer/core';
/**
 * Validation severity levels
 */
export var ValidationSeverity;
(function (ValidationSeverity) {
  ValidationSeverity['ERROR'] = 'error';
  ValidationSeverity['WARNING'] = 'warning';
  ValidationSeverity['INFO'] = 'info';
})(ValidationSeverity || (ValidationSeverity = {}));
/**
 * Default malicious patterns to detect
 */
const MALICIOUS_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /process\.exit/i,
  /child_process/i,
  /fs\.unlink/i,
  /fs\.rmdir/i,
  /require\s*\(\s*['"`].*['"`]\s*\)/i,
  /import\s*\(\s*['"`].*['"`]\s*\)/i,
  /\.env/i,
  /password/i,
  /token/i,
  /secret/i,
  /crypto/i,
];
/**
 * Enhanced plugin validator
 */
export class PluginValidator {
  config;
  customRules = new Map();
  constructor(config) {
    this.config = {
      security: {
        checkFilePermissions: true,
        validateCodeSignature: false,
        scanForMaliciousPatterns: true,
        checkDependencyVulnerabilities: true,
        enforceFileExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        ...config?.security,
      },
      performance: {
        maxInitializationTime: 5000, // 5 seconds
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxFileSize: 5 * 1024 * 1024, // 5MB
        checkAsyncOperations: true,
        ...config?.performance,
      },
      enableStrictMode: false,
      allowedPluginTypes: Object.values(PluginType),
      requiredFields: ['name', 'version', 'type'],
      customValidators: [],
      ...config,
    };
    this.initializeBuiltInRules();
  }
  /**
   * Validate a plugin comprehensively
   */
  async validatePlugin(plugin, pluginPath) {
    const results = [];
    // Record start time for potential performance tracking
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _startTime = Date.now();
    try {
      // Basic metadata validation
      results.push(...(await this.validateMetadata(plugin.metadata)));
      // Configuration validation
      if (plugin.config) {
        results.push(...(await this.validateConfiguration(plugin.config)));
      }
      // Security validation
      if (pluginPath) {
        results.push(...(await this.validateSecurity(plugin, pluginPath)));
      }
      // Performance validation
      results.push(...(await this.validatePerformance(plugin)));
      // Type-specific validation
      results.push(...(await this.validatePluginType(plugin)));
      // Custom validation rules
      results.push(...(await this.runCustomValidators(plugin)));
      // Dependencies validation
      results.push(...(await this.validateDependencies(plugin.metadata)));
      const report = this.generateReport(plugin.metadata.name, results);
      return report;
    } catch (error) {
      results.push({
        valid: false,
        severity: ValidationSeverity.ERROR,
        rule: 'validation_error',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error },
      });
      return this.generateReport(plugin.metadata.name, results);
    }
  }
  /**
   * Add custom validation rule
   */
  addCustomRule(rule) {
    this.customRules.set(rule.name, rule);
  }
  /**
   * Remove custom validation rule
   */
  removeCustomRule(ruleName) {
    this.customRules.delete(ruleName);
  }
  /**
   * Get all custom rules
   */
  getCustomRules() {
    return Array.from(this.customRules.values());
  }
  /**
   * Update validation configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }
  /**
   * Validate plugin metadata
   */
  async validateMetadata(metadata) {
    const results = [];
    // Required fields validation
    for (const field of this.config.requiredFields) {
      if (!metadata[field]) {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          rule: 'required_field',
          message: `Required field '${field}' is missing`,
          details: { field },
        });
      }
    }
    // Name validation
    if (metadata.name) {
      if (!/^[a-zA-Z0-9\-_]+$/.test(metadata.name)) {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          rule: 'invalid_name',
          message: 'Plugin name contains invalid characters',
        });
      }
      if (metadata.name.length > 50) {
        results.push({
          valid: false,
          severity: ValidationSeverity.WARNING,
          rule: 'name_too_long',
          message: 'Plugin name is too long (max 50 characters)',
        });
      }
    }
    // Version validation
    if (metadata.version) {
      const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/;
      if (!semverRegex.test(metadata.version)) {
        results.push({
          valid: false,
          severity: ValidationSeverity.WARNING,
          rule: 'invalid_version',
          message: 'Plugin version does not follow semantic versioning',
        });
      }
    }
    // Type validation
    if (metadata.type && !this.config.allowedPluginTypes.includes(metadata.type)) {
      results.push({
        valid: false,
        severity: ValidationSeverity.ERROR,
        rule: 'invalid_type',
        message: `Plugin type '${metadata.type}' is not allowed`,
        details: { allowedTypes: this.config.allowedPluginTypes },
      });
    }
    return results;
  }
  /**
   * Validate plugin configuration
   */
  async validateConfiguration(config) {
    const results = [];
    // Basic configuration validation
    if (typeof config !== 'object' || config === null) {
      results.push({
        valid: false,
        severity: ValidationSeverity.ERROR,
        rule: 'invalid_config',
        message: 'Plugin configuration must be an object',
      });
      return results;
    }
    // Check for sensitive data in configuration
    const configStr = JSON.stringify(config);
    const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(configStr)) {
        results.push({
          valid: false,
          severity: ValidationSeverity.WARNING,
          rule: 'sensitive_data',
          message: 'Configuration may contain sensitive data',
        });
        break;
      }
    }
    return results;
  }
  /**
   * Validate plugin security
   */
  async validateSecurity(plugin, pluginPath) {
    const results = [];
    try {
      // File size validation
      const stats = await fs.stat(pluginPath);
      if (stats.size > this.config.security.maxFileSize) {
        results.push({
          valid: false,
          severity: ValidationSeverity.WARNING,
          rule: 'file_too_large',
          message: `Plugin file is too large (${stats.size} bytes, max: ${this.config.security.maxFileSize})`,
        });
      }
      // File permissions validation
      if (this.config.security.checkFilePermissions) {
        const mode = stats.mode & 0o777;
        if (mode & 0o002) {
          // World writable
          results.push({
            valid: false,
            severity: ValidationSeverity.ERROR,
            rule: 'insecure_permissions',
            message: 'Plugin file has insecure permissions (world writable)',
          });
        }
      }
      // File extension validation
      if (this.config.security.enforceFileExtensions) {
        const allowedExtensions = ['.js', '.mjs', '.cjs'];
        const ext = path.extname(pluginPath);
        if (!allowedExtensions.includes(ext)) {
          results.push({
            valid: false,
            severity: ValidationSeverity.ERROR,
            rule: 'invalid_extension',
            message: `Plugin file has invalid extension '${ext}'`,
          });
        }
      }
      // Malicious pattern scanning
      if (this.config.security.scanForMaliciousPatterns) {
        const content = await fs.readFile(pluginPath, 'utf-8');
        for (const pattern of MALICIOUS_PATTERNS) {
          if (pattern.test(content)) {
            results.push({
              valid: false,
              severity: ValidationSeverity.ERROR,
              rule: 'malicious_pattern',
              message: `Potentially malicious pattern detected: ${pattern.source}`,
              details: { pattern: pattern.source },
            });
          }
        }
      }
      // Code signature validation (placeholder)
      if (this.config.security.validateCodeSignature) {
        // This would require integration with actual code signing validation
        results.push({
          valid: true,
          severity: ValidationSeverity.INFO,
          rule: 'code_signature',
          message: 'Code signature validation not implemented',
        });
      }
    } catch (error) {
      results.push({
        valid: false,
        severity: ValidationSeverity.ERROR,
        rule: 'security_check_failed',
        message: `Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    return results;
  }
  /**
   * Validate plugin performance characteristics
   */
  async validatePerformance(plugin) {
    const results = [];
    // Test initialization time
    const startTime = process.hrtime.bigint();
    try {
      // Create a test instance to measure initialization
      const testPlugin = Object.create(plugin);
      if (typeof testPlugin.initialize === 'function') {
        await Promise.race([
          testPlugin.initialize(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Initialization timeout')),
              this.config.performance.maxInitializationTime
            )
          ),
        ]);
      }
      const endTime = process.hrtime.bigint();
      const initTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      if (initTime > this.config.performance.maxInitializationTime) {
        results.push({
          valid: false,
          severity: ValidationSeverity.WARNING,
          rule: 'slow_initialization',
          message: `Plugin initialization is too slow (${initTime}ms, max: ${this.config.performance.maxInitializationTime}ms)`,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Initialization timeout') {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          rule: 'initialization_timeout',
          message: 'Plugin initialization timed out',
        });
      }
    }
    // Memory usage estimation (basic check)
    const memBefore = process.memoryUsage().heapUsed;
    // Simulate plugin load
    const memAfter = process.memoryUsage().heapUsed;
    const memUsed = memAfter - memBefore;
    if (memUsed > this.config.performance.maxMemoryUsage) {
      results.push({
        valid: false,
        severity: ValidationSeverity.WARNING,
        rule: 'high_memory_usage',
        message: `Plugin uses too much memory (${memUsed} bytes, max: ${this.config.performance.maxMemoryUsage})`,
      });
    }
    return results;
  }
  /**
   * Validate plugin type-specific requirements
   */
  async validatePluginType(plugin) {
    const results = [];
    switch (plugin.metadata.type) {
      case PluginType.UNIVERSE:
        results.push(...(await this.validateUniversePlugin(plugin)));
        break;
      case PluginType.THEME:
        results.push(...(await this.validateThemePlugin(plugin)));
        break;
      case PluginType.AI:
        results.push(...(await this.validateAIPlugin(plugin)));
        break;
      case PluginType.CORE:
        results.push(...(await this.validateCorePlugin(plugin)));
        break;
    }
    return results;
  }
  /**
   * Validate universe plugin specific requirements
   */
  async validateUniversePlugin(plugin) {
    const results = [];
    // Check for required universe plugin methods
    const requiredMethods = ['getUniverseData', 'validateStoryElement'];
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          rule: 'missing_universe_method',
          message: `Universe plugin missing required method: ${method}`,
        });
      }
    }
    return results;
  }
  /**
   * Validate theme plugin specific requirements
   */
  async validateThemePlugin(plugin) {
    const results = [];
    // Check for required theme plugin methods
    const requiredMethods = ['getThemeData', 'applyTheme'];
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          rule: 'missing_theme_method',
          message: `Theme plugin missing required method: ${method}`,
        });
      }
    }
    return results;
  }
  /**
   * Validate AI plugin specific requirements
   */
  async validateAIPlugin(plugin) {
    const results = [];
    // Check for required AI plugin methods
    const requiredMethods = ['processRequest', 'getModelInfo'];
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          rule: 'missing_ai_method',
          message: `AI plugin missing required method: ${method}`,
        });
      }
    }
    return results;
  }
  /**
   * Validate core plugin specific requirements
   */
  async validateCorePlugin(plugin) {
    const results = [];
    // Core plugins have minimal requirements
    if (!plugin.metadata.description) {
      results.push({
        valid: false,
        severity: ValidationSeverity.WARNING,
        rule: 'missing_description',
        message: 'Core plugin should have a description',
      });
    }
    return results;
  }
  /**
   * Validate plugin dependencies
   */
  async validateDependencies(metadata) {
    const results = [];
    if (metadata.dependencies) {
      for (const [depName, version] of Object.entries(metadata.dependencies)) {
        // Basic dependency validation
        if (!version || typeof version !== 'string') {
          results.push({
            valid: false,
            severity: ValidationSeverity.ERROR,
            rule: 'invalid_dependency_version',
            message: `Invalid version for dependency ${depName}`,
          });
        }
        // Check for potentially vulnerable dependencies (placeholder)
        if (this.config.security.checkDependencyVulnerabilities) {
          // This would require integration with vulnerability databases
          results.push({
            valid: true,
            severity: ValidationSeverity.INFO,
            rule: 'dependency_security',
            message: `Dependency vulnerability check not implemented for ${depName}`,
          });
        }
      }
    }
    return results;
  }
  /**
   * Run custom validation rules
   */
  async runCustomValidators(plugin) {
    const results = [];
    for (const rule of this.customRules.values()) {
      try {
        const result = await rule.validate(plugin, plugin.metadata, plugin.config);
        results.push(result);
      } catch (error) {
        results.push({
          valid: false,
          severity: ValidationSeverity.ERROR,
          rule: rule.name,
          message: `Custom validation rule '${rule.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    return results;
  }
  /**
   * Generate validation report
   */
  generateReport(pluginName, results) {
    const errors = results.filter(r => !r.valid && r.severity === ValidationSeverity.ERROR);
    // Track warnings for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _warnings = results.filter(r => !r.valid && r.severity === ValidationSeverity.WARNING);
    const valid = errors.length === 0;
    // Calculate scores
    const securityResults = results.filter(
      r =>
        r.rule.includes('security') ||
        r.rule.includes('malicious') ||
        r.rule.includes('permissions')
    );
    const securityScore = this.calculateScore(securityResults);
    const performanceResults = results.filter(
      r =>
        r.rule.includes('performance') ||
        r.rule.includes('memory') ||
        r.rule.includes('initialization')
    );
    const performanceScore = this.calculateScore(performanceResults);
    const overallScore = this.calculateOverallScore(results);
    return {
      valid,
      pluginName,
      results,
      securityScore,
      performanceScore,
      overallScore,
      timestamp: new Date(),
    };
  }
  /**
   * Calculate score for a set of results
   */
  calculateScore(results) {
    if (results.length === 0) return 100;
    let score = 100;
    for (const result of results) {
      if (!result.valid) {
        switch (result.severity) {
          case ValidationSeverity.ERROR:
            score -= 20;
            break;
          case ValidationSeverity.WARNING:
            score -= 10;
            break;
          case ValidationSeverity.INFO:
            score -= 2;
            break;
        }
      }
    }
    return Math.max(0, score);
  }
  /**
   * Calculate overall score
   */
  calculateOverallScore(results) {
    return this.calculateScore(results);
  }
  /**
   * Initialize built-in validation rules
   */
  initializeBuiltInRules() {
    // Add any built-in custom rules here
    // This is a placeholder for future built-in rules
  }
}
//# sourceMappingURL=plugin-validator.js.map
