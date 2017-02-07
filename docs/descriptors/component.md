# Component Descriptor

## Interface
    interface ComponentDescriptor {
        name: string;
        title?: string;
        description?: string;
    }

## Properties
* name

    * `required`
    * `string`
    
    The name of the component.  
    Should not be confused with the `title` property which is the readable name,
        this property is used to identify the components.  
    A name should start with a lower case (not forced) and contain only letters.
    
* title

    * `optional`
    * `string`
    
    The readable name of the component.  
    If a title isn't provided it will be defaulted to the `name` property with the first letter replaced with its upper case equivalent.
    
* description

    * `optional`
    * `string`
    
    The description for the component.