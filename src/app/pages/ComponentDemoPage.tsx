import React, { useState } from 'react';
import { 
  Button, 
  Input, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Select,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
  LoadingSpinner,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Form,
  FormField,
  FormLabel,
  FormDescription,
  FormActions,
  // Navigation and Disclosure Components
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Navigation,
  NavigationItem,
  NavigationLink,
  // Feedback and Overlay Components
  Tooltip,
  TooltipProvider,
  Popover,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverFooter,
  Alert,
  AlertTitle,
  AlertDescription,
  // Media Components
  AudioPlayer,
  FileUpload,
  Image,
  Avatar,
  Thumbnail,
  HeroImage,
  IconButton,
  ButtonGroup
} from '../../shared/design-system/components';
import { useToast, ToastManager } from '../../shared/design-system/hooks/useToast';

export function ComponentDemoPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('');

  return (
    <ToastManager>
      <TooltipProvider>
        <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">
            UI Component Library Demo
          </h1>
          <p className="text-lg text-neutral-600">
            Showcasing components built with Headless UI and Radix UI
          </p>
        </div>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700">Primary Buttons</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700">Button Variants</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700">States</p>
                <div className="flex flex-wrap gap-2">
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Components */}
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input 
                  label="Email Address"
                  placeholder="Enter your email"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  helperText="We'll never share your email"
                />
                
                <Input 
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  required
                />
                
                <Input 
                  label="Error Example"
                  placeholder="This field has an error"
                  error="This field is required"
                />
              </div>
              
              <div className="space-y-4">
                <Select 
                  label="Select Option"
                  placeholder="Choose an option"
                  value={selectValue}
                  onValueChange={setSelectValue}
                >
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </Select>
                
                <Select 
                  label="Required Select"
                  placeholder="Choose required option"
                  required
                  helperText="This field is required"
                >
                  <SelectItem value="a">Choice A</SelectItem>
                  <SelectItem value="b">Choice B</SelectItem>
                  <SelectItem value="c">Choice C</SelectItem>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog Component */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog Component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                Click the button below to open a modal dialog
              </p>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent size="md">
                  <DialogHeader>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>
                      This is a dialog description that explains what this dialog is about.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <p className="text-sm text-neutral-600">
                      This is the main content of the dialog. You can put forms, 
                      information, or any other content here.
                    </p>
                  </div>
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button>Confirm</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Form Components */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Form Components</CardTitle>
          </CardHeader>
          <CardContent>
            <Form onSubmit={(e) => console.log('Form submitted', e)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField name="agreement">
                  <Checkbox
                    checked={checkboxValue}
                    onCheckedChange={(checked) => setCheckboxValue(checked === true)}
                    label="I agree to the terms and conditions"
                    description="Please read our terms carefully before agreeing"
                  />
                </FormField>

                <FormField name="subscription">
                  <Checkbox
                    label="Subscribe to newsletter"
                    description="Get updates about new features and releases"
                  />
                </FormField>

                <FormField name="plan">
                  <FormLabel>Choose your plan</FormLabel>
                  <RadioGroup 
                    value={radioValue} 
                    onValueChange={setRadioValue}
                    className="mt-2"
                  >
                    <RadioGroupItem value="basic" label="Basic Plan" description="Perfect for getting started" />
                    <RadioGroupItem value="pro" label="Pro Plan" description="For growing businesses" />
                    <RadioGroupItem value="enterprise" label="Enterprise Plan" description="Full-featured solution" />
                  </RadioGroup>
                </FormField>

                <FormField name="notifications">
                  <FormLabel>Notification Preferences</FormLabel>
                  <FormDescription>How would you like to receive updates?</FormDescription>
                  <RadioGroup layout="vertical" className="mt-2">
                    <RadioGroupItem value="email" label="Email only" />
                    <RadioGroupItem value="sms" label="SMS only" />
                    <RadioGroupItem value="both" label="Both email and SMS" />
                    <RadioGroupItem value="none" label="No notifications" />
                  </RadioGroup>
                </FormField>
              </div>

              <FormActions>
                <Button variant="outline" type="button">Cancel</Button>
                <Button type="submit">Save Settings</Button>
              </FormActions>
            </Form>
          </CardContent>
        </Card>

        {/* Card Variants */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                This is a default card with standard styling.
              </p>
            </CardContent>
          </Card>
          
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                This card has elevated styling with more shadow.
              </p>
            </CardContent>
          </Card>
          
          <Card variant="gradient">
            <CardHeader>
              <CardTitle>Gradient Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                This card has a gradient background.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Loading Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-neutral-700">Primary Spinner</p>
                <LoadingSpinner variant="primary" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-neutral-700">Secondary Spinner</p>
                <LoadingSpinner variant="secondary" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-neutral-700">Large Spinner</p>
                <LoadingSpinner size="lg" variant="primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Components */}
        <Card>
          <CardHeader>
            <CardTitle>Navigation Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Navigation Menu</h3>
                <Navigation aria-label="Main navigation">
                  <NavigationItem active>Dashboard</NavigationItem>
                  <NavigationItem>Projects</NavigationItem>
                  <NavigationItem>Settings</NavigationItem>
                  <NavigationItem disabled>Reports</NavigationItem>
                </Navigation>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Pills Navigation</h3>
                <Navigation variant="pills" aria-label="Pills navigation">
                  <NavigationItem variant="pills">Overview</NavigationItem>
                  <NavigationItem variant="pills" active>Details</NavigationItem>
                  <NavigationItem variant="pills">History</NavigationItem>
                </Navigation>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Navigation with Links</h3>
                <Navigation variant="ghost" aria-label="Link navigation">
                  <NavigationLink href="#" active>Home</NavigationLink>
                  <NavigationLink href="#" variant="ghost">About</NavigationLink>
                  <NavigationLink href="#" variant="ghost">Contact</NavigationLink>
                </Navigation>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Component */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs Component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Default Tabs</h3>
                <Tabs defaultValue="tab1">
                  <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tab1">
                    <p>Content for tab 1. This is the first tab with some example content.</p>
                  </TabsContent>
                  <TabsContent value="tab2">
                    <p>Content for tab 2. This is the second tab with different content.</p>
                  </TabsContent>
                  <TabsContent value="tab3">
                    <p>Content for tab 3. This is the third tab with more content.</p>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Pills Tabs</h3>
                <Tabs defaultValue="account" variant="pills">
                  <TabsList variant="pills">
                    <TabsTrigger value="account" variant="pills">Account</TabsTrigger>
                    <TabsTrigger value="password" variant="pills">Password</TabsTrigger>
                    <TabsTrigger value="notifications" variant="pills">Notifications</TabsTrigger>
                  </TabsList>
                  <TabsContent value="account">
                    <p>Account settings and profile information.</p>
                  </TabsContent>
                  <TabsContent value="password">
                    <p>Password and security settings.</p>
                  </TabsContent>
                  <TabsContent value="notifications">
                    <p>Email and push notification preferences.</p>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Underline Tabs</h3>
                <Tabs defaultValue="overview" variant="underline">
                  <TabsList variant="underline">
                    <TabsTrigger value="overview" variant="underline">Overview</TabsTrigger>
                    <TabsTrigger value="analytics" variant="underline">Analytics</TabsTrigger>
                    <TabsTrigger value="reports" variant="underline">Reports</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <p>Overview dashboard with key metrics.</p>
                  </TabsContent>
                  <TabsContent value="analytics">
                    <p>Analytics data and insights.</p>
                  </TabsContent>
                  <TabsContent value="reports">
                    <p>Generated reports and documents.</p>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dropdown Component */}
        <Card>
          <CardHeader>
            <CardTitle>Dropdown Component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Default Dropdown</h3>
                <Dropdown>
                  <DropdownTrigger>Open Menu</DropdownTrigger>
                  <DropdownContent>
                    <DropdownLabel>My Account</DropdownLabel>
                    <DropdownItem>Profile</DropdownItem>
                    <DropdownItem>Settings</DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem>Logout</DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Ghost Dropdown</h3>
                <Dropdown>
                  <DropdownTrigger variant="ghost">Actions</DropdownTrigger>
                  <DropdownContent>
                    <DropdownItem>Edit</DropdownItem>
                    <DropdownItem>Duplicate</DropdownItem>
                    <DropdownItem>Archive</DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem variant="destructive">Delete</DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Dropdown with Selection</h3>
                <Dropdown>
                  <DropdownTrigger>Select Option</DropdownTrigger>
                  <DropdownContent>
                    <DropdownItem selected>Option 1</DropdownItem>
                    <DropdownItem>Option 2</DropdownItem>
                    <DropdownItem>Option 3</DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclosure Component */}
        <Card>
          <CardHeader>
            <CardTitle>Disclosure Component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Default Disclosure</h3>
                <Disclosure>
                  <DisclosureButton>
                    What is this component?
                  </DisclosureButton>
                  <DisclosurePanel>
                    This is a disclosure component that shows and hides content. It's useful for FAQ sections, collapsible content, and anywhere you need to conserve space.
                  </DisclosurePanel>
                </Disclosure>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Ghost Disclosure</h3>
                <Disclosure variant="ghost">
                  <DisclosureButton variant="ghost">
                    How does it work?
                  </DisclosureButton>
                  <DisclosurePanel variant="ghost">
                    The disclosure component uses Headless UI's Disclosure primitive to handle the show/hide functionality with proper accessibility support.
                  </DisclosurePanel>
                </Disclosure>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Outlined Disclosure</h3>
                <Disclosure variant="outlined">
                  <DisclosureButton variant="outlined">
                    Tell me more
                  </DisclosureButton>
                  <DisclosurePanel variant="outlined">
                    This variant has a border around the entire disclosure component, making it stand out more from the surrounding content.
                  </DisclosurePanel>
                </Disclosure>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback and Overlay Components */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ToastDemo />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tooltip Component</CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipDemo />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popover Component</CardTitle>
          </CardHeader>
          <CardContent>
            <PopoverDemo />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Component</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDemo />
          </CardContent>
        </Card>

        {/* Media Components Section */}
        <Card>
          <CardHeader>
            <CardTitle>Audio Player</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayerDemo />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadDemo />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image Components</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageDemo />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enhanced Button Components</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedButtonDemo />
          </CardContent>
        </Card>
      </div>
    </div>
      </TooltipProvider>
    </ToastManager>
  );
}

// Demo Components
function ToastDemo() {
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Button 
          onClick={() => toast({ title: "Success!", description: "Your action was completed successfully.", variant: "success" })}
          variant="outline" 
          size="sm"
        >
          Success Toast
        </Button>
        <Button 
          onClick={() => toast({ title: "Error occurred", description: "Something went wrong. Please try again.", variant: "error" })}
          variant="outline" 
          size="sm"
        >
          Error Toast
        </Button>
        <Button 
          onClick={() => toast({ title: "Warning", description: "Please review your input.", variant: "warning" })}
          variant="outline" 
          size="sm"
        >
          Warning Toast
        </Button>
        <Button 
          onClick={() => toast({ title: "Information", description: "Here's some helpful information.", variant: "info" })}
          variant="outline" 
          size="sm"
        >
          Info Toast
        </Button>
        <Button 
          onClick={() => toast({ 
            title: "Action Required", 
            description: "Would you like to continue?", 
            action: { label: "Continue", onClick: () => console.log("Continued") }
          })}
          variant="outline" 
          size="sm"
        >
          With Action
        </Button>
      </div>
    </div>
  );
}

function TooltipDemo() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tooltip content="This is a default tooltip">
          <Button variant="outline">Default</Button>
        </Tooltip>
        <Tooltip content="Success tooltip" variant="success">
          <Button variant="outline">Success</Button>
        </Tooltip>
        <Tooltip content="Error tooltip" variant="error">
          <Button variant="outline">Error</Button>
        </Tooltip>
        <Tooltip content="Warning tooltip" variant="warning">
          <Button variant="outline">Warning</Button>
        </Tooltip>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tooltip content="Top tooltip" side="top">
          <Button variant="ghost">Top</Button>
        </Tooltip>
        <Tooltip content="Right tooltip" side="right">
          <Button variant="ghost">Right</Button>
        </Tooltip>
        <Tooltip content="Bottom tooltip" side="bottom">
          <Button variant="ghost">Bottom</Button>
        </Tooltip>
        <Tooltip content="Left tooltip" side="left">
          <Button variant="ghost">Left</Button>
        </Tooltip>
      </div>
    </div>
  );
}

function PopoverDemo() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Popover content={
          <div>
            <PopoverHeader>
              <PopoverTitle>Default Popover</PopoverTitle>
            </PopoverHeader>
            <PopoverDescription>
              This is a simple popover with default styling.
            </PopoverDescription>
            <PopoverFooter>
              <Button size="sm">Action</Button>
            </PopoverFooter>
          </div>
        }>
          <Button variant="outline">Default Popover</Button>
        </Popover>
        
        <Popover 
          variant="ghost" 
          content={
            <div>
              <PopoverTitle>Ghost Popover</PopoverTitle>
              <PopoverDescription>
                This popover has a ghost variant styling.
              </PopoverDescription>
            </div>
          }
        >
          <Button variant="outline">Ghost Popover</Button>
        </Popover>
        
        <Popover 
          showArrow 
          content={
            <div>
              <PopoverTitle>With Arrow</PopoverTitle>
              <PopoverDescription>
                This popover includes an arrow pointer.
              </PopoverDescription>
            </div>
          }
        >
          <Button variant="outline">With Arrow</Button>
        </Popover>
      </div>
    </div>
  );
}

function AlertDemo() {
  const [alerts, setAlerts] = useState({
    success: true,
    error: true,
    warning: true,
    info: true,
  });

  const dismissAlert = (type: keyof typeof alerts) => {
    setAlerts(prev => ({ ...prev, [type]: false }));
  };

  return (
    <div className="space-y-4">
      {alerts.success && (
        <Alert variant="success" dismissible onDismiss={() => dismissAlert('success')}>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Your changes have been saved successfully.
          </AlertDescription>
        </Alert>
      )}
      
      {alerts.error && (
        <Alert variant="error" dismissible onDismiss={() => dismissAlert('error')}>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was an error processing your request. Please try again.
          </AlertDescription>
        </Alert>
      )}
      
      {alerts.warning && (
        <Alert variant="warning" dismissible onDismiss={() => dismissAlert('warning')}>
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Please review your input before proceeding.
          </AlertDescription>
        </Alert>
      )}
      
      {alerts.info && (
        <Alert variant="info" dismissible onDismiss={() => dismissAlert('info')}>
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            Here's some important information you should know.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setAlerts({ success: true, error: true, warning: true, info: true })}
        >
          Reset All Alerts
        </Button>
      </div>
    </div>
  );
}

// Media Components Demos
function AudioPlayerDemo() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">Default Audio Player</h3>
      <AudioPlayer
        src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
        title="Sample Audio Track"
        showPlaybackSpeed={true}
        showSkipButtons={true}
      />
      
      <h3 className="text-sm font-medium text-gray-900">Compact Audio Player</h3>
      <AudioPlayer
        src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
        title="Compact Version"
        variant="compact"
        size="sm"
        showPlaybackSpeed={false}
      />
    </div>
  );
}

function FileUploadDemo() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">Image Upload</h3>
      <FileUpload
        accept="image/*"
        multiple={true}
        maxFiles={3}
        maxSize={5 * 1024 * 1024} // 5MB
        onFilesChange={setFiles}
        allowedTypes={['image/jpeg', 'image/png', 'image/gif']}
        uploadText="Drop images here or click to upload"
        showPreview={true}
      />
      
      <h3 className="text-sm font-medium text-gray-900">Audio Upload</h3>
      <FileUpload
        accept="audio/*"
        multiple={false}
        maxSize={50 * 1024 * 1024} // 50MB
        allowedTypes={['audio/mp3', 'audio/wav', 'audio/m4a']}
        uploadText="Drop audio file here or click to upload"
        variant="default"
        size="lg"
      />
      
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files:</h4>
          <ul className="mt-2 text-sm text-gray-600">
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImageDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Avatar Images</h3>
        <div className="flex items-center space-x-4">
          <Avatar
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
            alt="User Avatar"
            size="sm"
          />
          <Avatar
            src="https://images.unsplash.com/photo-1494790108755-2616b612c6ac?w=150"
            alt="User Avatar"
            size="md"
          />
          <Avatar
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
            alt="User Avatar"
            size="lg"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Thumbnails</h3>
        <div className="flex items-center space-x-4">
          <Thumbnail
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200"
            alt="Thumbnail"
            size="sm"
          />
          <Thumbnail
            src="https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=200"
            alt="Thumbnail"
            size="md"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Image with Loading & Error States</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Image
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
            alt="Landscape"
            variant="rounded"
            size="full"
            className="h-48"
            fadeIn={true}
          />
          <Image
            src="https://invalid-url.jpg"
            alt="Error example"
            variant="rounded"
            size="full"
            className="h-48"
            retryOnError={true}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Hero Image</h3>
        <HeroImage
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
          alt="Hero Image"
          className="rounded-lg"
        />
      </div>
    </div>
  );
}

function EnhancedButtonDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">New Button Variants</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="success">Success</Button>
          <Button variant="success-outline">Success Outline</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="warning-outline">Warning Outline</Button>
          <Button variant="info">Info</Button>
          <Button variant="info-outline">Info Outline</Button>
          <Button variant="link">Link Button</Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Icon Buttons</h3>
        <div className="flex items-center space-x-3">
          <IconButton
            icon={<span>🔍</span>}
            aria-label="Search"
            variant="primary"
            size="icon-sm"
          />
          <IconButton
            icon={<span>⚙️</span>}
            aria-label="Settings"
            variant="secondary"
            size="icon"
          />
          <IconButton
            icon={<span>❤️</span>}
            aria-label="Like"
            variant="danger"
            size="icon-lg"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Button with Icons</h3>
        <div className="flex flex-wrap gap-3">
          <Button leftIcon={<span>📁</span>}>
            Open File
          </Button>
          <Button rightIcon={<span>➡️</span>}>
            Next Step
          </Button>
          <Button 
            leftIcon={<span>💾</span>}
            rightIcon={<span>✓</span>}
            variant="success"
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Button Groups</h3>
        <div className="space-y-3">
          <ButtonGroup orientation="horizontal" spacing="sm">
            <Button variant="outline">Previous</Button>
            <Button variant="primary">Current</Button>
            <Button variant="outline">Next</Button>
          </ButtonGroup>
          
          <ButtonGroup orientation="vertical" spacing="none">
            <Button variant="secondary" className="rounded-b-none">
              Option 1
            </Button>
            <Button variant="secondary" className="rounded-none border-t-0">
              Option 2
            </Button>
            <Button variant="secondary" className="rounded-t-none border-t-0">
              Option 3
            </Button>
          </ButtonGroup>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Loading States</h3>
        <div className="flex flex-wrap gap-3">
          <Button loading={true}>Processing...</Button>
          <Button loading={true} loadingText="Uploading...">
            Upload File
          </Button>
          <Button 
            loading={true} 
            variant="success"
            leftIcon={<span>💾</span>}
          >
            Saving...
          </Button>
        </div>
      </div>
    </div>
  );
} 