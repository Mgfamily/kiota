﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Kiota.Builder.Configuration;
using Kiota.Builder.Lock;
using Microsoft.OpenApi.ApiManifest;

namespace Kiota.Builder.WorkspaceManagement;

#pragma warning disable CA2227 // Collection properties should be read only
public class ApiClientConfiguration : ICloneable
{
    /// <summary>
    /// The location of the OpenAPI description file.
    /// </summary>
    public string DescriptionLocation { get; set; } = string.Empty;
    /// <summary>
    /// The language for this client.
    /// </summary>
    public string Language { get; set; } = string.Empty;
    /// <summary>
    /// The structured mime types used for this client.
    /// </summary>
#pragma warning disable CA1002
    public List<string> StructuredMimeTypes { get; set; } = new();
#pragma warning restore CA1002
    /// <summary>
    /// The path patterns for API endpoints to include for this client.
    /// </summary>
    public HashSet<string> IncludePatterns { get; set; } = new();
    /// <summary>
    /// The path patterns for API endpoints to exclude for this client.
    /// </summary>
    public HashSet<string> ExcludePatterns { get; set; } = new();
    /// <summary>
    /// The output path for the generated code, related to the configuration file.
    /// </summary>
    public string OutputPath { get; set; } = string.Empty;
    /// <summary>
    /// The main namespace for this client.
    /// </summary>
    public string ClientNamespaceName { get; set; } = string.Empty;
    /// <summary>
    /// Whether the backing store was used for this client.
    /// </summary>
    public bool UsesBackingStore
    {
        get; set;
    }
    /// <summary>
    /// Whether additional data was used for this client.
    /// </summary>
    public bool IncludeAdditionalData
    {
        get; set;
    }
    /// <summary>
    /// Whether backward compatible code was excluded for this client.
    /// </summary>
    public bool ExcludeBackwardCompatible
    {
        get; set;
    }
    /// <summary>
    /// The OpenAPI validation rules to disable during the generation.
    /// </summary>
    public HashSet<string> DisabledValidationRules { get; set; } = new();
    /// <summary>
    /// Initializes a new instance of the <see cref="ApiClientConfiguration"/> class.
    /// </summary>
    public ApiClientConfiguration()
    {

    }
    /// <summary>
    /// Initializes a new instance of the <see cref="ApiClientConfiguration"/> class from an existing <see cref="GenerationConfiguration"/>.
    /// </summary>
    /// <param name="config">The configuration to use to initialize the client configuration</param>
    public ApiClientConfiguration(GenerationConfiguration config)
    {
        ArgumentNullException.ThrowIfNull(config);
        Language = config.Language.ToString();
        ClientNamespaceName = config.ClientNamespaceName;
        UsesBackingStore = config.UsesBackingStore;
        ExcludeBackwardCompatible = config.ExcludeBackwardCompatible;
        IncludeAdditionalData = config.IncludeAdditionalData;
        StructuredMimeTypes = config.StructuredMimeTypes.ToList();
        IncludePatterns = config.IncludePatterns;
        ExcludePatterns = config.ExcludePatterns;
        DescriptionLocation = config.OpenAPIFilePath;
        DisabledValidationRules = config.DisabledValidationRules;
        OutputPath = config.OutputPath;
    }
    /// <summary>
    /// Updates the passed configuration with the values from the config file.
    /// </summary>
    /// <param name="config">Generation configuration to update.</param>
    /// <param name="clientName">Client name serving as class name.</param>
    /// <param name="requests">The requests to use when updating an existing client.</param>
    public void UpdateGenerationConfigurationFromApiClientConfiguration(GenerationConfiguration config, string clientName, IList<RequestInfo>? requests = default)
    {
        ArgumentNullException.ThrowIfNull(config);
        ArgumentException.ThrowIfNullOrEmpty(clientName);
        config.ClientNamespaceName = ClientNamespaceName;
        if (Enum.TryParse<GenerationLanguage>(Language, out var parsedLanguage))
            config.Language = parsedLanguage;
        config.UsesBackingStore = UsesBackingStore;
        config.ExcludeBackwardCompatible = ExcludeBackwardCompatible;
        config.IncludeAdditionalData = IncludeAdditionalData;
        config.StructuredMimeTypes = new(StructuredMimeTypes);
        config.IncludePatterns = IncludePatterns;
        config.ExcludePatterns = ExcludePatterns;
        config.OpenAPIFilePath = DescriptionLocation;
        config.DisabledValidationRules = DisabledValidationRules;
        config.OutputPath = OutputPath;
        config.ClientClassName = clientName;
        config.Serializers.Clear();
        config.Deserializers.Clear();
        if (requests is { Count: > 0 })
        {
            config.PatternsOverride = requests.Where(static x => !x.Exclude && !string.IsNullOrEmpty(x.Method) && !string.IsNullOrEmpty(x.UriTemplate))
                                            .Select(static x => $"/{x.UriTemplate}#{x.Method!.ToUpperInvariant()}")
                                            .ToHashSet();
        }
    }

    public object Clone()
    {
        return new ApiClientConfiguration
        {
            DescriptionLocation = DescriptionLocation,
            Language = Language,
            StructuredMimeTypes = [.. StructuredMimeTypes],
            IncludePatterns = new(IncludePatterns, StringComparer.OrdinalIgnoreCase),
            ExcludePatterns = new(ExcludePatterns, StringComparer.OrdinalIgnoreCase),
            OutputPath = OutputPath,
            ClientNamespaceName = ClientNamespaceName,
            UsesBackingStore = UsesBackingStore,
            IncludeAdditionalData = IncludeAdditionalData,
            ExcludeBackwardCompatible = ExcludeBackwardCompatible,
            DisabledValidationRules = new(DisabledValidationRules, StringComparer.OrdinalIgnoreCase),
        };
    }
    public void NormalizePaths(string targetDirectory)
    {
        if (Path.IsPathRooted(OutputPath))
            OutputPath = "./" + Path.GetRelativePath(targetDirectory, OutputPath);
    }
}
#pragma warning restore CA2227 // Collection properties should be read only
