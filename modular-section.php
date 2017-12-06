<?php
namespace Grav\Plugin;

use Grav\Common\Plugin;
use Grav\Common\Grav;
use Grav\Common\Page\Page;
use RocketTheme\Toolbox\Event\Event;

class ModularSectionPlugin extends Plugin
{

    public static function getSubscribedEvents()
    {
        return [
            'onPluginsInitialized' => ['onPluginsInitialized', 0]
        ];
    }
	
	public function onPluginsInitialized(){
        
        $this->grav['locator']->addPath('blueprints', '', __DIR__ . DS . 'blueprints');
        
        if ($this->isAdmin()) {
            $this->initializeAdmin();
        }

        $this->initializeGlobal();
    }
	
	/**
     * Admin side initialization ---------------------------------------------------------
     */
    public function initializeAdmin()
    {		
		$this->enable([
            'onAssetsInitialized' => ['initializeAssets', 0],
            'onAdminTwigTemplatePaths' => ['onAdminTwigTemplatePaths', -10],
            'onTwigSiteVariables' => ['onTwigSiteVariables', 0],
		]);
    }

    public function initializeAssets() {
        $this->grav['assets']->addJs('plugin://' . $this->name . '/admin/js/sortable.min.js');
        $this->grav['assets']->addJs('plugin://' . $this->name . '/admin/js/selectArray.js');
        $this->grav['assets']->addJs('plugin://' . $this->name . '/admin/js/advancedArray.js');
        $this->grav['assets']->addJs('plugin://' . $this->name . '/admin/js/selectableList.js');
        $this->grav['assets']->addCss('plugin://' . $this->name . '/css-compiled/selectArray.css', -100);
        $this->grav['assets']->addCss('plugin://' . $this->name . '/css-compiled/selectableList.css', -100);
    }

    public function onAdminTwigTemplatePaths($e) {
        $paths = $e['paths'];
        $paths[] = __DIR__ . DS . 'admin/templates';
        $e['paths'] = $paths;
    }

    public function onTwigSiteVariables()
    {
        $twig = $this->grav['twig'];
        $page = $this->grav['page'];
        /*$post = $this->grav['admin'];
        dump($post);*/
        $twig->twig_vars['POSTDATA'] = $_POST;
    }


    /**
     * Global side initialization ---------------------------------------------------------
     */
    public function initializeGlobal()
    {
        $this->enable([
            'onTwigTemplatePaths' => ['onTwigTemplatePaths', 0],
            'onGetPageBlueprints'   => ['onGetPageBlueprints', 0],
            'onGetPageTemplates'   => ['onGetPageTemplates', 0],
        ]);

    }

    /**
     * Add plugin templates path and css
     */
    public function onTwigTemplatePaths()
    {
        $this->grav['twig']->twig_paths[] = __DIR__ . '/templates';
    }

    public function onGetPageBlueprints(Event $event)
    {
        /* @var Types $types */
        $types  = $event->types;
        /* @var UniformResourceLocator $locator*/
        $locator = Grav::instance()['locator'];
        $types->scanBlueprints($locator->findResource('plugin://' . $this->name . '/blueprints'));
    }
    public function onGetPageTemplates(Event $event)
    {
        /* @var Types $types */
        $types  = $event->types;
//        $types->scanTemplates('plugin://widgets/templates/');
        /* @var UniformResourceLocator $locator*/
        $locator = Grav::instance()['locator'];
        $types->scanTemplates($locator->findResource('plugin://' . $this->name . '/templates'));
    }
    
}
